// Types
import type {
  Product as WireProduct,
  ProductCategory as WireProductCategory,
  PublicProduct,
  PublicProductCard,
  PublicProductCategory,
  PublicProductImage,
} from '@harness-monorepo/contracts';
import type {
  ProductCategoryModel,
  ProductImageModel,
  ProductModel,
} from '../../generated/prisma/models.js';
import { isSoldOut, ON_THE_SHELF_WHERE } from './catalog.visibility.js';

/**
 * A category carries a count the storefront uses to hide an empty one, and Prisma answers it under
 * `_count`. Demanding it in the row type is what stops a call site forgetting the `_count` and
 * shipping a category that claims to hold nothing.
 */
export type ProductCategoryRow = ProductCategoryModel & {
  _count: { products: number };
  parent: { slug: string } | null;
};

/**
 * The storefront's row, which carries one more thing: whether anything here is published at all.
 *
 * Existing and having something on the shelf are different questions, and answering both with one
 * number is what made a category disappear the day its last item sold — taking its address with it,
 * while the sold-out product's own page went on linking to it twice.
 */
export type PublicProductCategoryRow = ProductCategoryRow & { products: { id: string }[] };

/**
 * The storefront's include. It answers two questions, and they are not the same question.
 *
 * `_count` is how many are **on the shelf** — what `PublicProductCategory.productCount` promises and
 * what the menu prints. Without the `where` it counted drafts and sold-out rows too, so a category
 * holding ten of them reported ten and opened onto nothing.
 *
 * `products` is one row, or none: whether anything here is **published at all**. It exists because
 * the count cannot say it. A category whose last item sold out has a count of zero and still
 * exists — its address is in somebody's Instagram bio, and the sold-out product's page links to it
 * from the breadcrumb and from its back button. Dropping it on a count of zero turned all three
 * into a 404 the moment a shop made the last sale of the day.
 */
export const productCategoryInclude = {
  _count: { select: { products: { where: ON_THE_SHELF_WHERE } } },
  products: { where: { status: 'ACTIVE' }, select: { id: true }, take: 1 },
  // The slug and not the id: the wire speaks in slugs, because that is what a URL carries, and a
  // web app holding a parent's uuid could do nothing with it.
  parent: { select: { slug: true } },
} as const;

/**
 * The panel's include, and the reason it is a second one.
 *
 * The shopkeeper's question is "what is filed here", never "what can a visitor buy right now". Sold
 * out is exactly the row they opened this screen to find, and a category reading "0 produtos" over
 * two products they still sell is an invitation to delete it — the relation is `SetNull`, so the
 * products survive and quietly lose their category, which is the one outcome nobody would choose.
 * Drafts are counted here for the same reason they are listed in the products table.
 */
export const productCategoryAdminInclude = {
  _count: { select: { products: true } },
  parent: { select: { slug: true } },
} as const;

/** A photo with the option values it is of. */
export type ProductImageRow = ProductImageModel & { values: { valueId: string }[] };

/** Images are always read with a product: the card needs the first one and the page needs them all. */
export type ProductRow = ProductModel & {
  images: ProductImageRow[];
  category: ProductCategoryRow | null;
};

export const productInclude = {
  images: { orderBy: { position: 'asc' }, include: { values: { select: { valueId: true } } } },
  category: { include: productCategoryInclude },
} as const;

/** What a card is drawn from: the first photo's address and nothing else of the gallery. */
export type ProductCardRow = ProductModel & {
  images: { url: string }[];
  category: ProductCategoryRow | null;
  /** On a shelf's read only: whether a card can add the product without a choice. */
  _count?: { options: number };
};

/**
 * The storefront grid's read. A page of cards shows one photo each, so it asks for one — not every
 * photo and what each is of, which is a second query over up to 96 galleries that the grid drops.
 */
export const productCardInclude = {
  images: { select: { url: true }, orderBy: { position: 'asc' }, take: 1 },
  category: { include: productCategoryInclude },
  _count: { select: { options: true } },
} as const;

export function toPublicProductCategory(row: ProductCategoryRow): PublicProductCategory {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    imageUrl: row.imageUrl,
    parentSlug: row.parent?.slug ?? null,
    // Direct children only. A parent's real total is rolled up in the service, which is the one
    // place that has the whole tree in hand — a mapper sees one row and cannot count a subtree.
    productCount: row._count.products,
  } satisfies PublicProductCategory;
}

export function toProductCategory(row: ProductCategoryRow): WireProductCategory {
  return {
    ...toPublicProductCategory(row),
    position: row.position,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } satisfies WireProductCategory;
}

function toPublicProductImage(row: ProductImageRow): PublicProductImage {
  return {
    id: row.id,
    url: row.url,
    alt: row.alt,
    optionValueIds: row.values.map((value) => value.valueId),
  } satisfies PublicProductImage;
}

/**
 * What a grid is served. A listing of forty products must not carry forty descriptions: this shape
 * is what ends up in the cached HTML of every indexed page, so a field is added here on purpose.
 *
 * `imageUrl` is the first image because the rows arrive ordered by position — there is no
 * `isPrimary` flag to disagree with that order.
 */
export function toPublicProductCard(row: ProductCardRow): PublicProductCard {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    priceCents: row.priceCents,
    compareAtPriceCents: row.compareAtPriceCents,
    imageUrl: row.images[0]?.url ?? null,
    categorySlug: row.category?.slug ?? null,
    priceRange: { minCents: row.priceCents, maxCents: row.maxPriceCents },
    ...(row._count ? { hasOptions: row._count.options > 0 } : {}),
  } satisfies PublicProductCard;
}

export function toPublicProduct(row: ProductRow): PublicProduct {
  return {
    ...toPublicProductCard(row),
    // Derived, never the count itself: how many a shop has left is its own business, and a number
    // on the public wire is one a competitor can read off the page every morning.
    soldOut: isSoldOut(row),
    description: row.description,
    images: row.images.map(toPublicProductImage),
    category: row.category ? toPublicProductCategory(row.category) : null,
  } satisfies PublicProduct;
}

export function toProduct(row: ProductRow): WireProduct {
  return {
    ...toPublicProduct(row),
    position: row.position,
    status: row.status,
    origin: row.origin,
    // Owner-only, every one of them. They are absent from `toPublicProduct` on purpose: what a
    // shop paid, what it calls the thing internally and how heavy the box is are not the shop
    // window's business, and anything on the public shape lands in Google's index.
    costCents: row.costCents,
    sku: row.sku,
    barcode: row.barcode,
    trackStock: row.trackStock,
    stockQuantity: row.stockQuantity,
    weightGrams: row.weightGrams,
    lengthMm: row.lengthMm,
    widthMm: row.widthMm,
    heightMm: row.heightMm,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } satisfies WireProduct;
}
