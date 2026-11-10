// Nest
import { BadRequestException } from '@nestjs/common';

// Types
import type { CreateOrderItemInput, OrderVariantInvalidDetails } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { variantLabelOf } from '../catalog/variant-label.js';
import { kitPartsOf, lineKeyOf, type KitReadVariant, type OrderKitPartLine } from './order-kit-lines.js';
import { orderError } from './orders.constants.js';

export type { OrderKitPartLine } from './order-kit-lines.js';

/** A line as it will be photographed, and what pricing reads of its product beside it. */
export interface OrderLine {
  productId: string;
  variantId: string;
  productName: string;
  variantLabel: string | null;
  sku: string | null;
  unitPriceCents: number;
  quantity: number;
  /** The product's category and that category's parent — not kept on the order: a promotion on either covers the line. */
  categoryIds: string[];
  /** The product's own cashback rate — not kept on the order either: what the order earned is. */
  cashbackRateBps: number | null;
  /** On a kit's line, what goes in each kit (plan 2026-11-10--kits-monte-seu-kit); null on any other. */
  kitParts: OrderKitPartLine[] | null;
}

/**
 * The lines of an order or of a quote: each variant read from this shop, and priced by it — the
 * catalogue's price, before any promotion. Another shop's variant, a combination that stopped
 * existing and one not sold are all the same refusal, with every such line named so a cart can say
 * which of its products left the shop. A product chosen for a kit is read the same way, and is
 * named the same way when it is gone.
 *
 * `onSaleOnly` keeps to what the shop window sells: a product put back in draft is off sale to a
 * shopper, while the shopkeeper may still register a sale of one of their own drafts.
 */
export async function readOrderLines(db: Prisma.TransactionClient, storeId: string, items: readonly CreateOrderItemInput[], onSaleOnly: boolean): Promise<OrderLine[]> {
  const keys = items.map(lineKeyOf);
  if (new Set(keys).size !== keys.length) {
    throw new BadRequestException(orderError('ORDER_ITEM_DUPLICATE', 'A variant appears on two lines'));
  }

  const ids = [...new Set(items.flatMap((item) => [item.variantId, ...(item.kit ?? []).map((part) => part.variantId)]))];
  const variants = await db.productVariant.findMany({
    where: { id: { in: ids }, storeId, archivedAt: null, isActive: true, ...(onSaleOnly ? { product: { status: 'ACTIVE' } } : {}) },
    select: {
      id: true,
      productId: true,
      priceCents: true,
      sku: true,
      product: {
        select: { name: true, categoryId: true, cashbackRateBps: true, kitSize: true, kitScope: true, kitCategories: { select: { categoryId: true } }, category: { select: { parentId: true } } },
      },
      values: { select: { option: { select: { name: true, position: true } }, value: { select: { name: true } } } },
    },
  });
  if (variants.length !== ids.length) {
    const found = new Set(variants.map((variant) => variant.id));
    throw new BadRequestException({
      ...orderError('ORDER_VARIANT_INVALID', 'A variant is not one this shop sells'),
      details: { variantIds: ids.filter((id) => !found.has(id)) } satisfies OrderVariantInvalidDetails,
    });
  }

  const read = new Map(
    variants.map((variant) => {
      const categoryIds = [variant.product.categoryId, variant.product.category?.parentId].filter((id): id is string => typeof id === 'string');
      const variantLabel = variantLabelOf(variant.values.map((chosen) => ({ optionName: chosen.option.name, optionPosition: chosen.option.position, valueName: chosen.value.name })));
      const kit: KitReadVariant = {
        id: variant.id,
        productId: variant.productId,
        productName: variant.product.name,
        variantLabel,
        kitSize: variant.product.kitSize,
        kitScope: variant.product.kitScope,
        kitCategoryIds: variant.product.kitCategories.map((named) => named.categoryId),
        categoryIds,
      };
      return [variant.id, { variant, kit, categoryIds, variantLabel }] as const;
    }),
  );
  const kits = new Map([...read].map(([id, entry]) => [id, entry.kit]));

  return items.map((item) => {
    const { variant, kit, categoryIds, variantLabel } = read.get(item.variantId)!;
    return {
      productId: variant.productId,
      variantId: variant.id,
      productName: variant.product.name,
      variantLabel,
      sku: variant.sku,
      unitPriceCents: variant.priceCents,
      quantity: item.quantity,
      categoryIds,
      cashbackRateBps: variant.product.cashbackRateBps,
      kitParts: kitPartsOf(item, kit, kits),
    };
  });
}
