// Nest
import { BadRequestException } from '@nestjs/common';

// Types
import type { CreateOrderItemInput, OrderVariantInvalidDetails } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { variantLabelOf } from '../catalog/variant-label.js';
import { orderError } from './orders.constants.js';

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
}

/**
 * The lines of an order or of a quote: each variant read from this shop, and priced by it — the
 * catalogue's price, before any promotion. Another shop's variant, a combination that stopped
 * existing and one not sold are all the same refusal, with every such line named so a cart can say
 * which of its products left the shop.
 *
 * `onSaleOnly` keeps to what the shop window sells: a product put back in draft is off sale to a
 * shopper, while the shopkeeper may still register a sale of one of their own drafts.
 */
export async function readOrderLines(db: Prisma.TransactionClient, storeId: string, items: readonly CreateOrderItemInput[], onSaleOnly: boolean): Promise<OrderLine[]> {
  const ids = items.map((item) => item.variantId);
  if (new Set(ids).size !== ids.length) {
    throw new BadRequestException(orderError('ORDER_ITEM_DUPLICATE', 'A variant appears on two lines'));
  }

  const variants = await db.productVariant.findMany({
    where: { id: { in: ids }, storeId, archivedAt: null, isActive: true, ...(onSaleOnly ? { product: { status: 'ACTIVE' } } : {}) },
    select: {
      id: true,
      productId: true,
      priceCents: true,
      sku: true,
      product: { select: { name: true, categoryId: true, cashbackRateBps: true, category: { select: { parentId: true } } } },
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

  const byId = new Map(variants.map((variant) => [variant.id, variant]));
  return items.map((item) => {
    const variant = byId.get(item.variantId)!;
    return {
      productId: variant.productId,
      variantId: variant.id,
      productName: variant.product.name,
      variantLabel: variantLabelOf(
        variant.values.map((chosen) => ({
          optionName: chosen.option.name,
          optionPosition: chosen.option.position,
          valueName: chosen.value.name,
        })),
      ),
      sku: variant.sku,
      unitPriceCents: variant.priceCents,
      quantity: item.quantity,
      categoryIds: [variant.product.categoryId, variant.product.category?.parentId].filter((id): id is string => typeof id === 'string'),
      cashbackRateBps: variant.product.cashbackRateBps,
    };
  });
}
