// Types
import type { Prisma } from '../../generated/prisma/client.js';

type Tx = Prisma.TransactionClient;

/**
 * The product's published reviews' cache (`reviewCount`, `reviewRatingSum`), moved by each review
 * write in its transaction: one published review counts in, one hidden counts out, an edit moves the
 * sum by the difference. Atomic increments, so two writes at once add up instead of one overwriting.
 */
export async function countIn(tx: Tx, productId: string, rating: number): Promise<void> {
  await tx.product.update({ where: { id: productId }, data: { reviewCount: { increment: 1 }, reviewRatingSum: { increment: rating } } });
}

export async function countOut(tx: Tx, productId: string, rating: number): Promise<void> {
  await tx.product.update({ where: { id: productId }, data: { reviewCount: { decrement: 1 }, reviewRatingSum: { decrement: rating } } });
}

export async function recount(tx: Tx, productId: string, before: number, after: number): Promise<void> {
  if (before !== after) await tx.product.update({ where: { id: productId }, data: { reviewRatingSum: { increment: after - before } } });
}

/** A review, locked until the transaction ends: its visibility and its rating are read and moved as one. */
export async function lockReview(tx: Tx, reviewId: string): Promise<void> {
  await tx.$queryRaw`SELECT 1 FROM "product_reviews" WHERE "id" = ${reviewId}::uuid FOR UPDATE`;
}
