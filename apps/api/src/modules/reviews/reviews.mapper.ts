// Types
import type { CustomerReview, PublicReview, ReviewRating, StoreReview } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

/** What each side reads with a review: the product as a card names it, and the customer. */
export const reviewInclude = {
  product: { select: { id: true, name: true, slug: true, images: { select: { url: true }, orderBy: { position: 'asc' }, take: 1 } } },
  customer: { select: { id: true, name: true, userId: true } },
} as const satisfies Prisma.ProductReviewInclude;

export type ReviewRow = Prisma.ProductReviewGetPayload<{ include: typeof reviewInclude }>;

/**
 * "Rafael S.": the first name and the last one's initial — the shop window shows who, not their whole
 * name. "Cliente" once the record no longer has its account, or has no name to show.
 */
export function authorNameOf(customer: { name: string; userId: string | null }): string {
  const words = customer.name.trim().split(/\s+/).filter(Boolean);
  if (!customer.userId || words.length === 0) return 'Cliente';
  const [first] = words;
  const last = words.length > 1 ? words.at(-1) : undefined;
  return last ? `${first} ${Array.from(last)[0]!.toUpperCase()}.` : first!;
}

export function toPublicReview(row: ReviewRow): PublicReview {
  return {
    id: row.id,
    rating: row.rating as ReviewRating,
    comment: row.comment,
    authorName: authorNameOf(row.customer),
    variantLabel: row.variantLabel,
    createdAt: row.createdAt.toISOString(),
  } satisfies PublicReview;
}

export function toCustomerReview(row: ReviewRow): CustomerReview {
  return {
    id: row.id,
    productId: row.product.id,
    slug: row.product.slug,
    name: row.product.name,
    imageUrl: row.product.images[0]?.url ?? null,
    rating: row.rating as ReviewRating,
    comment: row.comment,
    variantLabel: row.variantLabel,
    hidden: row.hiddenAt !== null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } satisfies CustomerReview;
}

export function toStoreReview(row: ReviewRow): StoreReview {
  return {
    id: row.id,
    rating: row.rating as ReviewRating,
    comment: row.comment,
    variantLabel: row.variantLabel,
    product: { id: row.product.id, name: row.product.name, slug: row.product.slug },
    customer: { id: row.customer.id, name: row.customer.name },
    hidden: row.hiddenAt !== null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } satisfies StoreReview;
}
