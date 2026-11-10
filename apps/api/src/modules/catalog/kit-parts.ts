// Nest
import { NotFoundException } from '@nestjs/common';

// Types
import type { StorefrontKitParts } from '@harness-monorepo/contracts';

// App
import type { PrismaService } from '../../shared/prisma/prisma.service.js';
import { catalogError } from './catalog-slug.service.js';
import { isVariantAvailable } from './catalog.visibility.js';

/** As many as a page of a kit draws: a category of more is a shelf, and the shelf is a page of its own. */
const KIT_PARTS_MAX = 200;

/**
 * What a kit is put together from (plan 2026-11-10--kits-monte-seu-kit): the active products its rule
 * lets in — every one of the shop, those of the categories it names, or every one but theirs, a
 * subcategory going with its category, as the order checks it (`kitLetsIn`) — of one combination
 * each and none a kit, in the shop's order. A product with options is left out: its page is where one
 * of its combinations is chosen. A sold-out one is listed, marked. None for a kit of some categories
 * that are all gone, and the kit says so.
 */
export async function kitPartsOf(prisma: PrismaService, storeId: string, productSlug: string): Promise<StorefrontKitParts> {
  const kit = await prisma.product.findFirst({
    where: { storeId, slug: productSlug, status: 'ACTIVE', kitSize: { not: null } },
    select: { kitSize: true, kitScope: true, kitCategories: { select: { categoryId: true } } },
  });
  if (!kit) throw new NotFoundException(catalogError('PRODUCT_NOT_FOUND', `No kit at "${productSlug}"`));

  const size = kit.kitSize!;
  const named = kit.kitCategories.map((rule) => rule.categoryId);
  if (kit.kitScope === 'ONLY' && named.length === 0) return { size, parts: [] };
  // The categories named and the subcategories under them, read first: a filter through the category's
  // parent compares a top level's NULL to the list, and drops the product whichever way it is asked.
  const children = named.length ? await prisma.productCategory.findMany({ where: { storeId, parentId: { in: named } }, select: { id: true } }) : [];
  const covered = [...named, ...children.map((child) => child.id)];

  const rows = await prisma.product.findMany({
    where: {
      storeId,
      status: 'ACTIVE',
      kitSize: null,
      options: { none: {} },
      // Every one but theirs lets in a product of no category, which `notIn` alone would drop for its NULL.
      ...(kit.kitScope === 'ONLY' ? { categoryId: { in: covered } } : kit.kitScope === 'EXCEPT' && covered.length ? { OR: [{ categoryId: null }, { categoryId: { notIn: covered } }] } : {}),
    },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
    take: KIT_PARTS_MAX,
    select: {
      id: true,
      slug: true,
      name: true,
      images: { orderBy: [{ position: 'asc' }, { id: 'asc' }], take: 1, select: { url: true } },
      variants: { where: { archivedAt: null }, take: 2, select: { id: true, isActive: true, trackStock: true, stockQuantity: true } },
    },
  });

  return {
    size,
    parts: rows.flatMap((row) => {
      const [variant, another] = row.variants;
      if (!variant || another) return [];
      return [{ productId: row.id, variantId: variant.id, slug: row.slug, name: row.name, imageUrl: row.images[0]?.url ?? null, available: isVariantAvailable(variant) }];
    }),
  };
}
