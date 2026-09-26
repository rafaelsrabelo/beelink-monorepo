// Nest
import { ConflictException } from '@nestjs/common';

// Types
import type { OrderStockDetails, OrderStockShortage } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { lockProduct, syncProductCache } from '../catalog/variant-cache.js';
import { orderError } from './orders.constants.js';

type Tx = Prisma.TransactionClient;

/** A line as the stock sees it: which combination, of which product, how many. */
export interface StockLine {
  productId: string;
  variantId: string;
  quantity: number;
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
 * Selling past what is left is refused, every short line named with how many are left: a stock that
 * is wrong is the shopkeeper's to correct, and an order that silently drove it below zero would hide
 * the mistake. Read after the products' lock, so a catalogue edit or another order cannot move the
 * count between the check and the take.
 */
export async function takeStock(tx: Tx, lines: readonly StockLine[]): Promise<void> {
  const counted = await tx.productVariant.findMany({
    where: { id: { in: lines.map((line) => line.variantId) }, trackStock: true },
    select: { productId: true },
  });
  if (!counted.length) return;

  const productIds = await lockProducts(tx, counted.map((row) => row.productId));
  const fresh = await tx.productVariant.findMany({
    where: { id: { in: lines.map((line) => line.variantId) }, trackStock: true },
    select: { id: true, stockQuantity: true },
  });
  const left = new Map(fresh.map((row) => [row.id, row.stockQuantity ?? 0]));

  const shortages: OrderStockShortage[] = lines.flatMap((line) => {
    const available = left.get(line.variantId);
    return available !== undefined && available < line.quantity ? [{ variantId: line.variantId, available: Math.max(available, 0) }] : [];
  });
  if (shortages.length) {
    throw new ConflictException({
      ...orderError('ORDER_STOCK_INSUFFICIENT', 'A counted combination has fewer left than the order asks for'),
      details: { shortages } satisfies OrderStockDetails,
    });
  }

  for (const line of lines) {
    if (!left.has(line.variantId)) continue;
    await tx.productVariant.update({ where: { id: line.variantId }, data: { stockQuantity: left.get(line.variantId)! - line.quantity } });
  }
  for (const productId of productIds) await syncProductCache(tx, productId);
}

/**
 * Gives a cancelled order's lines back to the combinations the shop still counts. One no longer
 * counted is left alone — the shopkeeper stopped counting it — and so is one that is gone.
 */
export async function returnStock(tx: Tx, orderId: string): Promise<void> {
  const items = await tx.orderItem.findMany({
    where: { orderId, variantId: { not: null } },
    select: { variantId: true, quantity: true, variant: { select: { productId: true, trackStock: true } } },
  });
  const counted = items.filter((item) => item.variant?.trackStock);
  if (!counted.length) return;

  const productIds = await lockProducts(tx, counted.map((item) => item.variant!.productId));
  for (const item of counted) {
    const now = await tx.productVariant.findUniqueOrThrow({ where: { id: item.variantId! }, select: { stockQuantity: true } });
    await tx.productVariant.update({ where: { id: item.variantId! }, data: { stockQuantity: (now.stockQuantity ?? 0) + item.quantity } });
  }
  for (const productId of productIds) await syncProductCache(tx, productId);
}
