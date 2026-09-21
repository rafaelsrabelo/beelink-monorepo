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

/**
 * A category carries a count the storefront uses to hide an empty one, and Prisma answers it under
 * `_count`. Demanding it in the row type is what stops a call site forgetting the `_count` and
 * shipping a category that claims to hold nothing.
 */
export type ProductCategoryRow = ProductCategoryModel & { _count: { products: number } };

/** The one query shape the category mappers accept. */
export const productCategoryInclude = { _count: { select: { products: true } } } as const;

/** Images are always read with a product: the card needs the first one and the page needs them all. */
export type ProductRow = ProductModel & {
  images: ProductImageModel[];
  category: ProductCategoryRow | null;
};

export const productInclude = {
  images: { orderBy: { position: 'asc' } },
  category: { include: productCategoryInclude },
} as const;

export function toPublicProductCategory(row: ProductCategoryRow): PublicProductCategory {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    imageUrl: row.imageUrl,
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

function toPublicProductImage(row: ProductImageModel): PublicProductImage {
  return { id: row.id, url: row.url, alt: row.alt } satisfies PublicProductImage;
}

/**
 * What a grid is served. A listing of forty products must not carry forty descriptions: this shape
 * is what ends up in the cached HTML of every indexed page, so a field is added here on purpose.
 *
 * `imageUrl` is the first image because the rows arrive ordered by position — there is no
 * `isPrimary` flag to disagree with that order.
 */
export function toPublicProductCard(row: ProductRow): PublicProductCard {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    priceCents: row.priceCents,
    compareAtPriceCents: row.compareAtPriceCents,
    imageUrl: row.images[0]?.url ?? null,
    categorySlug: row.category?.slug ?? null,
  } satisfies PublicProductCard;
}

export function toPublicProduct(row: ProductRow): PublicProduct {
  return {
    ...toPublicProductCard(row),
    description: row.description,
    images: row.images.map(toPublicProductImage),
    category: row.category ? toPublicProductCategory(row.category) : null,
  } satisfies PublicProduct;
}

export function toProduct(row: ProductRow): WireProduct {
  return {
    ...toPublicProduct(row),
    position: row.position,
    isAvailable: row.isAvailable,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } satisfies WireProduct;
}
