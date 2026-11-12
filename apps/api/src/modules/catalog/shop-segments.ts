// Types
import type { Prisma } from '../../generated/prisma/client.js';

/*
  `/<shop>/<segment>` is one namespace (IMPULSEIA-103): the shop window reads a route word, then a
  category, then an affiliate's `/name`. Route words are refused by both, up front; a category and an
  affiliate claim a segment under one advisory lock per shop and segment, held until the claiming
  transaction ends, and only then ask who holds it — so two claims of one segment wait for each other,
  and the second finds the first. The unique keys of each table stand behind it.
*/

type Db = Prisma.TransactionClient;

/** Who holds a segment of a shop: a category, now or before a rename — an old slug still leads to it — or an affiliate. */
export type ShopSegmentHolder = 'CATEGORY' | 'AFFILIATE';

/** Takes the segment's lock for the rest of the caller's transaction. Every claim of a segment takes it first. */
export async function lockShopSegment(tx: Db, storeId: string, segment: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`shop-segment:${storeId}:${segment}`}, 0))`;
}

/** Who holds the segment in the shop, leaving out the row that claims it; null when nobody does. One statement. */
export async function shopSegmentHolder(
  db: Db,
  storeId: string,
  segment: string,
  claimant: { categoryId?: string; affiliateId?: string } = {},
): Promise<ShopSegmentHolder | null> {
  const [row] = await db.$queryRaw<{ category: boolean; affiliate: boolean }[]>`
    SELECT EXISTS (
             SELECT 1 FROM "product_categories"
             WHERE "storeId" = ${storeId}::uuid AND ("slug" = ${segment} OR ${segment} = ANY ("slugHistory"))
               AND "id" IS DISTINCT FROM ${claimant.categoryId ?? null}::uuid
           ) AS "category",
           EXISTS (
             SELECT 1 FROM "affiliates"
             WHERE "storeId" = ${storeId}::uuid AND "slug" = ${segment} AND "id" IS DISTINCT FROM ${claimant.affiliateId ?? null}::uuid
           ) AS "affiliate"`;

  if (row?.category) return 'CATEGORY';
  if (row?.affiliate) return 'AFFILIATE';
  return null;
}
