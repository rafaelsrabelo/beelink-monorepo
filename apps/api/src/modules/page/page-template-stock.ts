// Types
import type { Prisma } from '../../generated/prisma/client.js';
import type { ShopStock } from './home-templates.js';

// App
import { ON_THE_SHELF_WHERE } from '../catalog/catalog.visibility.js';
import { runningShelfPromotions, shelfSaleOf } from '../promotions/shelf-sale.js';
import { COVER_SLIDES_MAX } from './home-templates.js';

/** A category as the stock reads it: whether it is a top level, and what it holds on the shelf itself. */
export interface StockedCategory {
  id: string;
  name: string;
  parentId: string | null;
  onShelf: number;
}

/**
 * The top-level categories with something on the shelf, in the order given. A child's products count
 * for its parent, as a category's showcase draws them; a child whose parent is hidden — absent from
 * these rows, which are the visible ones — counts for nobody, as on the shop window.
 */
export function stockedCategories(rows: readonly StockedCategory[]): ShopStock['categories'] {
  const held = new Map(rows.filter((row) => !row.parentId).map((row) => [row.id, row.onShelf]));

  for (const row of rows) {
    if (row.parentId && held.has(row.parentId)) held.set(row.parentId, held.get(row.parentId)! + row.onShelf);
  }

  return rows.filter((row) => !row.parentId && held.get(row.id)! > 0).map((row) => ({ id: row.id, name: row.name }));
}

/**
 * What a shop has to fill its home with, read now. The shelf and the sale are the shop window's own
 * rules (`ON_THE_SHELF_WHERE`, `shelfSaleOf` over the promotions running), so a model arranges a band
 * only when the page would draw something in it.
 *
 * Under a transaction the caller has locked, or on its own for a preview: it only reads.
 */
export async function shopStockOf(db: Prisma.TransactionClient, storeId: string, now: Date): Promise<ShopStock> {
  const shelf = { storeId, AND: [ON_THE_SHELF_WHERE] } satisfies Prisma.ProductWhereInput;
  const { onSale } = shelfSaleOf(await runningShelfPromotions(db, storeId, now), [], db.product.fields.priceCents);
  const sale = { storeId, AND: [ON_THE_SHELF_WHERE, onSale] } satisfies Prisma.ProductWhereInput;
  const firstPicture = { orderBy: [{ position: 'asc' }, { id: 'asc' }], take: 1, select: { url: true } } satisfies Prisma.Product$imagesArgs;

  const [store, products, pictured, onSaleCount, firstOnSale, categories] = await Promise.all([
    db.store.findUniqueOrThrow({ where: { id: storeId }, select: { name: true } }),
    db.product.count({ where: shelf }),
    db.product.findMany({
      where: { ...shelf, images: { some: {} } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: COVER_SLIDES_MAX,
      select: { id: true, name: true, images: firstPicture },
    }),
    db.product.count({ where: sale }),
    db.product.findFirst({
      where: sale,
      orderBy: [{ position: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true, images: firstPicture },
    }),
    db.productCategory.findMany({
      where: { storeId, isActive: true },
      orderBy: [{ position: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true, parentId: true, _count: { select: { products: { where: ON_THE_SHELF_WHERE } } } },
    }),
  ]);

  return {
    name: store.name,
    products,
    pictured: pictured.flatMap((product) => (product.images[0] ? [{ id: product.id, name: product.name, imageUrl: product.images[0].url }] : [])),
    onSale: {
      count: onSaleCount,
      first: firstOnSale ? { id: firstOnSale.id, name: firstOnSale.name, imageUrl: firstOnSale.images[0]?.url ?? null } : null,
    },
    categories: stockedCategories(categories.map((row) => ({ id: row.id, name: row.name, parentId: row.parentId, onShelf: row._count.products }))),
  };
}
