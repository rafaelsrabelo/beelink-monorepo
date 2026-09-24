// Types
import type { Prisma } from '../../generated/prisma/client.js';
import type { ProductVariantModel } from '../../generated/prisma/models.js';

/** The client a write goes through: the injected one, or a transaction's. */
type Db = Prisma.TransactionClient;

/**
 * The columns a product and each of its variants both carry. The variant's are the truth; the
 * product's are the cache that `productCacheOf` computes from them.
 */
export const PER_UNIT_FIELDS = [
  'priceCents',
  'compareAtPriceCents',
  'costCents',
  'sku',
  'barcode',
  'trackStock',
  'stockQuantity',
  'weightGrams',
  'lengthMm',
  'widthMm',
  'heightMm',
] as const;

export type PerUnitField = (typeof PER_UNIT_FIELDS)[number];
export type PerUnitValues = Pick<ProductVariantModel, PerUnitField>;
export type VariantCacheRow = PerUnitValues & Pick<ProductVariantModel, 'isActive'>;

/**
 * What a product's own per-unit columns hold, given its variants in position order.
 *
 * Only what is on sale counts, because the grid, the shelf rule and the showcases read these
 * columns to describe what a visitor can order:
 * - the price is the cheapest variant on sale, with that variant's "was" price, so a card never
 *   pairs one variant's price with another's discount;
 * - the product is counted only when every variant on sale is counted — one made to order is enough
 *   for it never to be sold out — and the stock is the sum of theirs;
 * - the codes, cost, weight and box come from the first variant on sale.
 *
 * With nothing on sale the product is counted with none left, which takes it off the shelf the way
 * a sold-out product leaves it. A product with a single variant gets that variant's values as they
 * are, so a product without options reads back exactly what was written to it.
 */
export function productCacheOf(variants: readonly VariantCacheRow[]): PerUnitValues {
  const selling = variants.filter((variant) => variant.isActive);
  const pool = selling.length > 0 ? selling : variants;
  const [lead] = pool;
  if (!lead) throw new Error('A product always has at least one variant');

  const cheapest = pool.reduce((best, variant) => (variant.priceCents < best.priceCents ? variant : best), lead);
  const counts = selling.flatMap((variant) => (variant.stockQuantity === null ? [] : [variant.stockQuantity]));

  return {
    priceCents: cheapest.priceCents,
    compareAtPriceCents: cheapest.compareAtPriceCents,
    costCents: lead.costCents,
    sku: lead.sku,
    barcode: lead.barcode,
    trackStock: selling.every((variant) => variant.trackStock),
    stockQuantity: selling.length === 0 ? 0 : counts.length === 0 ? null : counts.reduce((sum, count) => sum + count, 0),
    weightGrams: lead.weightGrams,
    lengthMm: lead.lengthMm,
    widthMm: lead.widthMm,
    heightMm: lead.heightMm,
  };
}

/** The per-unit fields a patch carries, and only those. */
export function perUnitPatchOf(patch: Partial<Record<PerUnitField, unknown>>): Partial<PerUnitValues> {
  return Object.fromEntries(
    PER_UNIT_FIELDS.filter((field) => patch[field] !== undefined).map((field) => [field, patch[field]]),
  ) as Partial<PerUnitValues>;
}

/**
 * One write that touches a product's variants at a time, until the transaction ends.
 *
 * The cache is read from the variants and then written, and two saves interleaving those two steps
 * would leave it describing neither.
 */
export async function lockProduct(db: Db, productId: string): Promise<void> {
  await db.$queryRaw`SELECT 1 FROM "products" WHERE "id" = ${productId}::uuid FOR UPDATE`;
}

/** Rewrites a product's cache from its variants. Call it inside the transaction that changed them. */
export async function syncProductCache(db: Db, productId: string): Promise<void> {
  const variants = await db.productVariant.findMany({
    where: { productId },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
  });

  await db.product.update({ where: { id: productId }, data: productCacheOf(variants) });
}
