// Nest
import { ConflictException } from '@nestjs/common';

// Types
import type { OrderStockDetails, OrderStockShortage } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { lockProduct, syncProductCache } from '../catalog/variant-cache.js';
import { orderError } from './orders.constants.js';

type Tx = Prisma.TransactionClient;

/** A line as the stock sees it: which combination, of which product, how many — and, on a kit's line, what goes in each kit. */
export interface StockLine {
  productId: string;
  variantId: string;
  quantity: number;
  kitParts?: readonly { productId: string; variantId: string; quantity: number }[] | null;
}

/** How many of each combination an order takes, a kit's products added in (plan 2026-11-10--kits-monte-seu-kit). */
interface Demand {
  productId: string;
  quantity: number;
}

/**
 * Every combination the lines take, once, with all of it added up: a kit takes what goes in it times
 * how many kits — never the kit's own variant, which keeps no stock — and a product bought loose and
 * chosen for a kit too is one demand, so neither passes the check on what the other leaves.
 */
function demandOf(lines: readonly StockLine[]): Map<string, Demand> {
  const demand = new Map<string, Demand>();
  const take = (variantId: string, productId: string, quantity: number) => {
    const now = demand.get(variantId);
    demand.set(variantId, { productId, quantity: (now?.quantity ?? 0) + quantity });
  };
  for (const line of lines) {
    if (line.kitParts?.length) for (const part of line.kitParts) take(part.variantId, part.productId, part.quantity * line.quantity);
    else take(line.variantId, line.productId, line.quantity);
  }
  return demand;
}

/** Each product once, in one order, so two writes that lock several never wait on each other in a circle. */
async function lockProducts(tx: Tx, productIds: readonly string[]): Promise<string[]> {
  const sorted = [...new Set(productIds)].sort();
  for (const productId of sorted) await lockProduct(tx, productId);
  return sorted;
}

/**
 * Takes an order's lines off the stock of the combinations the shop counts, inside the transaction
 * that writes the order. One the shop does not count is left alone: made to order has no stock.
 *
 * Selling past what is left is refused, every short combination named with how many are left — and
 * by its product's name, which a kit's cart has on no line of its own: a stock that is wrong is the
 * shopkeeper's to correct, and an order that silently drove it below zero would hide the mistake.
 * Read after the products' lock, so a catalogue edit or another order cannot move the count between
 * the check and the take.
 */
export async function takeStock(tx: Tx, lines: readonly StockLine[]): Promise<void> {
  const demand = demandOf(lines);
  const ids = [...demand.keys()];
  const counted = await tx.productVariant.findMany({ where: { id: { in: ids }, trackStock: true }, select: { productId: true } });
  if (!counted.length) return;

  const productIds = await lockProducts(tx, counted.map((row) => row.productId));
  const fresh = await tx.productVariant.findMany({
    where: { id: { in: ids }, trackStock: true },
    select: { id: true, stockQuantity: true, product: { select: { name: true } } },
  });
  const left = new Map(fresh.map((row) => [row.id, row.stockQuantity ?? 0]));
  const names = new Map(fresh.map((row) => [row.id, row.product.name]));

  const shortages: OrderStockShortage[] = [...demand].flatMap(([variantId, wanted]) => {
    const available = left.get(variantId);
    return available !== undefined && available < wanted.quantity ? [{ variantId, available: Math.max(available, 0), productName: names.get(variantId)! }] : [];
  });
  if (shortages.length) {
    throw new ConflictException({
      ...orderError('ORDER_STOCK_INSUFFICIENT', 'A counted combination has fewer left than the order asks for'),
      details: { shortages } satisfies OrderStockDetails,
    });
  }

  for (const [variantId, wanted] of demand) {
    if (!left.has(variantId)) continue;
    await tx.productVariant.update({ where: { id: variantId }, data: { stockQuantity: left.get(variantId)! - wanted.quantity } });
  }
  for (const productId of productIds) await syncProductCache(tx, productId);
}

/**
 * Gives a cancelled order's lines back to the combinations the shop still counts — a kit's, what
 * went in it. One no longer counted is left alone — the shopkeeper stopped counting it — and so is
 * one that is gone.
 */
export async function returnStock(tx: Tx, orderId: string): Promise<void> {
  const variant = { select: { productId: true, trackStock: true } };
  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: { variantId: true, quantity: true, variant, kitParts: { select: { variantId: true, quantity: true, variant } } },
  });
  const back = new Map<string, Demand>();
  const give = (variantId: string, productId: string, quantity: number) => back.set(variantId, { productId, quantity: (back.get(variantId)?.quantity ?? 0) + quantity });
  for (const item of items) {
    // A kit's line gives back what went in it, a product since deleted left out — never the kit's own variant.
    if (item.kitParts.length) {
      for (const part of item.kitParts) if (part.variantId && part.variant?.trackStock) give(part.variantId, part.variant.productId, part.quantity * item.quantity);
    } else if (item.variantId && item.variant?.trackStock) give(item.variantId, item.variant.productId, item.quantity);
  }
  if (!back.size) return;

  const productIds = await lockProducts(tx, [...back.values()].map((entry) => entry.productId));
  for (const [variantId, entry] of back) {
    const now = await tx.productVariant.findUniqueOrThrow({ where: { id: variantId }, select: { stockQuantity: true } });
    await tx.productVariant.update({ where: { id: variantId }, data: { stockQuantity: (now.stockQuantity ?? 0) + entry.quantity } });
  }
  for (const productId of productIds) await syncProductCache(tx, productId);
}
