// Types
import type { Prisma } from '../../generated/prisma/client.js';
import type { ProductImportItemDto } from './dto/product-import.dto.js';

// App
import { slugify } from '../../shared/slug.js';
import { planVariants } from './variant-combinations.js';
import { syncProductCache } from './variant-cache.js';
import { applyPlan, writeOptions } from './variant-writes.js';

type Db = Prisma.TransactionClient;

/** "Picolés", "picoles" and " PICOLÉS " are one category: the key is the segment they would share. */
export function categoryKeyOf(name: string): string {
  return slugify(name);
}

/**
 * The first of `base`, `base-2`, `base-3`… that nothing holds, cut so the suffix fits.
 *
 * Importing the same menu twice is the likeliest way to meet a taken slug, and refusing the whole
 * import over it would leave the shopkeeper renaming rows by hand to find out which.
 */
export function freeSlug(base: string, taken: ReadonlySet<string>, max: number): string {
  const fitted = base.slice(0, max).replace(/-+$/, '');
  if (!taken.has(fitted)) return fitted;

  for (let n = 2; ; n += 1) {
    const suffix = `-${n}`;
    const candidate = `${base.slice(0, max - suffix.length).replace(/-+$/, '')}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
}

export interface ImportedProductPlace {
  storeId: string;
  slug: string;
  categoryId: string | null;
  position: number;
}

/**
 * One product, as the product service creates one, and then its option as the variations editor
 * writes one — the same `writeOptions`, `planVariants` and `applyPlan`, inside the import's
 * transaction instead of one of their own. The default variant becomes the first value's, every
 * other value copies it, and a value priced apart from the product is repriced on its variant.
 */
export async function createImportedProduct(tx: Db, item: ProductImportItemDto, place: ImportedProductPlace): Promise<string> {
  const perUnit = {
    priceCents: item.priceCents,
    compareAtPriceCents: null,
    costCents: null,
    sku: null,
    barcode: null,
    trackStock: false,
    stockQuantity: null,
    weightGrams: null,
    lengthMm: null,
    widthMm: null,
    heightMm: null,
  };

  const product = await tx.product.create({
    data: {
      storeId: place.storeId,
      slug: place.slug,
      name: item.name,
      description: item.description ?? null,
      categoryId: place.categoryId,
      // Always a draft: it has no photo yet, and nothing reaches the shop window by accident.
      status: 'DRAFT',
      ...perUnit,
      maxPriceCents: perUnit.priceCents,
      position: place.position,
      variants: { create: [{ storeId: place.storeId, position: 0, ...perUnit }] },
    },
    select: { id: true, variants: { include: { values: true } } },
  });

  const option = item.option;
  if (!option) return product.id;

  const shapes = await writeOptions(
    tx,
    product.id,
    { options: [{ name: option.name, values: option.values.map((value) => ({ name: value.name })) }] },
    [],
  );
  const plan = planVariants(
    shapes,
    product.variants.map((variant) => ({ id: variant.id, isActive: variant.isActive, valueByOption: new Map() })),
  );
  await applyPlan(tx, place.storeId, product.id, shapes, plan, product.variants);

  const valueIds = shapes[0]?.valueIds ?? [];
  for (const [index, value] of option.values.entries()) {
    const valueId = valueIds[index];
    if (!valueId || value.priceCents === undefined || value.priceCents === null || value.priceCents === item.priceCents) continue;

    await tx.productVariant.updateMany({
      where: { productId: product.id, archivedAt: null, values: { some: { valueId } } },
      data: { priceCents: value.priceCents },
    });
  }

  await syncProductCache(tx, product.id);
  return product.id;
}
