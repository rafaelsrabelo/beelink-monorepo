// Nest
import { BadRequestException } from '@nestjs/common';

// Types
import type { CreateOrderItemInput, KitScope, OrderKitInvalidDetails } from '@harness-monorepo/contracts';

// App
import { orderError } from './orders.constants.js';

/** One product chosen for a kit's line, as it will be photographed: how many of it go in each kit. */
export interface OrderKitPartLine {
  productId: string;
  variantId: string;
  productName: string;
  variantLabel: string | null;
  quantity: number;
}

/** What the kit's rules read of a variant: its product's kit, if it is one, and where it sits. */
export interface KitReadVariant {
  id: string;
  productId: string;
  productName: string;
  variantLabel: string | null;
  kitSize: number | null;
  kitScope: KitScope | null;
  /** The categories the kit's rule names. */
  kitCategoryIds: readonly string[];
  /** The product's category and that category's parent: a product of a subcategory goes with the category it sits under. */
  categoryIds: readonly string[];
}

/** Whether a kit's rule lets a product in: every one, those of its categories, or every one but theirs. */
export function kitLetsIn(kit: Pick<KitReadVariant, 'kitScope' | 'kitCategoryIds'>, product: Pick<KitReadVariant, 'categoryIds'>): boolean {
  const named = product.categoryIds.some((id) => kit.kitCategoryIds.includes(id));
  return kit.kitScope === 'ALL' || (kit.kitScope === 'ONLY' ? named : !named);
}

/**
 * What a line says goes in it, as a line is told apart from another: a kit's line by its kit's
 * variant and what goes in it, every other by its variant. Two kits of one product with other
 * products in them are two lines; the same composition twice is one line sent twice.
 */
export function lineKeyOf(item: CreateOrderItemInput): string {
  const parts = item.kit?.length ? [...item.kit].sort((a, b) => (a.variantId < b.variantId ? -1 : a.variantId > b.variantId ? 1 : 0)).map((part) => `${part.variantId}*${part.quantity}`) : [];
  return parts.length ? `${item.variantId}|${parts.join(',')}` : item.variantId;
}

/**
 * The products chosen for a kit's line, checked against the kit (plan 2026-11-10--kits-monte-seu-kit):
 * each a product its rule lets in (`kitLetsIn`) and no kit itself, each once, their quantities adding
 * up to the kit's size. A line of anything else takes no composition. Null for a line that is no kit.
 * Every refusal is `ORDER_KIT_INVALID`, naming the kit's variant.
 */
export function kitPartsOf(item: CreateOrderItemInput, variant: KitReadVariant, read: ReadonlyMap<string, KitReadVariant>): OrderKitPartLine[] | null {
  const parts = item.kit ?? [];
  const refuse = (message: string) =>
    new BadRequestException({ ...orderError('ORDER_KIT_INVALID', message), details: { variantId: item.variantId } satisfies OrderKitInvalidDetails });

  if (variant.kitSize === null) {
    if (parts.length) throw refuse('A composition was sent for a line that is no kit');
    return null;
  }
  if (!parts.length) throw refuse('A kit was sent without what goes in it');
  if (new Set(parts.map((part) => part.variantId)).size !== parts.length) throw refuse('A product appears twice in one kit');
  if (parts.reduce((sum, part) => sum + part.quantity, 0) !== variant.kitSize) throw refuse('What goes in the kit does not add up to its size');

  return parts.map((part) => {
    const chosen = read.get(part.variantId)!;
    if (chosen.kitSize !== null) throw refuse('A kit cannot go in a kit');
    if (!kitLetsIn(variant, chosen)) throw refuse('A product is not one the kit lets in');
    return { productId: chosen.productId, variantId: chosen.id, productName: chosen.productName, variantLabel: chosen.variantLabel, quantity: part.quantity };
  });
}
