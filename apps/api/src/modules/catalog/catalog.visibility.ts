// Types
import type { ProductModel } from '../../generated/prisma/models.js';
import type { ProductWhereInput } from '../../generated/prisma/models/Product.js';

/**
 * What a visitor is allowed to see, written once because three separate queries decide it.
 *
 * Before this file each of them carried its own copy of the rule, and the copies had already drifted
 * apart in the way that is hardest to notice: they agreed. Agreeing copies are not one rule — they
 * are two rules that happen to match today, and the first one somebody edits is the day a category
 * appears in the menu advertising twelve products and opens onto an empty grid.
 *
 * The three are `ProductsService.listPublic` (the grid, the category, the search), the `_count` in
 * `productCategoryInclude` (how many a category is said to hold), and — deliberately — NOT
 * `publicBySlug`. See ON_THE_SHELF_WHERE for why the third one is different.
 */

/**
 * Sold out, as a fact about the shelf rather than about the shopkeeper's intent.
 *
 * `trackStock` off means the shop does not count this product at all — made to order — and is never
 * sold out however empty `stockQuantity` happens to be. A null quantity on a counted product is a
 * shopkeeper who turned counting on and has not said how many: from the shelf, that is none.
 *
 * It is kept apart from `status` on purpose. A product can be a draft and sold out at once, and
 * collapsing the two into one state is what made the panel unable to say which of them a hidden
 * product was.
 */
export function isSoldOut(row: Pick<ProductModel, 'trackStock' | 'stockQuantity'>): boolean {
  return row.trackStock && (row.stockQuantity ?? 0) <= 0;
}

/**
 * The same rule as a `where`, for the two queries that must not return a sold-out product.
 *
 * **It carries a top-level `OR`.** Spread into an object that already has one — `listPublic`'s
 * search does — the second silently overwrites the first, and the filtered search answers the
 * search alone with a total that agrees with it. Nothing looks wrong until someone counts by hand.
 * Use it as an element of `AND`, never as a spread, wherever another condition might carry an `OR`.
 *
 * `publicBySlug` is **not** one of its callers, and that is a decision rather than an oversight: a
 * product's address is the thing this product puts on WhatsApp, and the schema's own note on
 * `slugHistory` calls a 404 there "the most visible failure this product can produce". So the page
 * keeps answering when the shelf is empty, marked sold out, with no way to order — the visitor
 * learns the shop has the thing and it ran out, instead of learning the shop is gone.
 */
export const ON_THE_SHELF_WHERE = {
  status: 'ACTIVE',
  OR: [{ trackStock: false }, { stockQuantity: { gt: 0 } }],
} as const satisfies ProductWhereInput;
