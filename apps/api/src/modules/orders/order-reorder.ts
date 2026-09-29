// Types
import type { CustomerReorder, CustomerReorderLeft, CustomerReorderLine } from '@harness-monorepo/contracts';

/** An order's line as the reorder reads it: what it named, and how many. */
export interface ReorderItem {
  productId: string | null;
  variantId: string | null;
  productName: string;
  variantLabel: string | null;
  quantity: number;
}

/** A combination as it stands today: whether the shop sells it, and what its stock allows. */
export interface ReorderVariant {
  id: string;
  productId: string;
  isActive: boolean;
  archivedAt: Date | null;
  trackStock: boolean;
  stockQuantity: number | null;
  productStatus: 'ACTIVE' | 'DRAFT';
  /** Whether a shopper chooses a combination at all: a product without options is added by its product alone. */
  productHasOptions: boolean;
}

/**
 * An order's lines against today's catalogue. A line whose combination is gone, switched off,
 * archived, or whose product is not on sale stays out; one with none left stays out as sold out;
 * one with fewer left than the order had goes in with what there is. The rule the checkout places
 * by, so what the cart gets is what it can order.
 */
export function reorderOf(number: number, items: readonly ReorderItem[], variants: readonly ReorderVariant[]): CustomerReorder {
  const byId = new Map(variants.map((variant) => [variant.id, variant]));
  const lines: CustomerReorderLine[] = [];
  const left: CustomerReorderLeft[] = [];

  for (const item of items) {
    const variant = item.variantId ? byId.get(item.variantId) : undefined;
    const named = { productName: item.productName, variantLabel: item.variantLabel };

    if (!variant || !variant.isActive || variant.archivedAt || variant.productStatus !== 'ACTIVE') {
      left.push({ ...named, reason: 'OFF_SALE', added: 0 });
      continue;
    }
    const stock = variant.trackStock ? Math.max(variant.stockQuantity ?? 0, 0) : Number.POSITIVE_INFINITY;
    if (stock === 0) {
      left.push({ ...named, reason: 'SOLD_OUT', added: 0 });
      continue;
    }
    const quantity = Math.min(item.quantity, stock);
    lines.push({ productId: variant.productId, variantId: variant.productHasOptions ? variant.id : null, quantity });
    if (quantity < item.quantity) left.push({ ...named, reason: 'LIMITED', added: quantity });
  }

  return { number, lines, left };
}
