// Types
import type { CustomerDuplicate, CustomerDuplicateReason } from '@harness-monorepo/contracts';

// App
import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../shared/prisma/prisma.service.js';

/*
  Which of a shop's records may be one person. One predicate, written once, so the list's flag and
  the record's list of duplicates never disagree: a flag with nobody behind it on the record would
  be a promise the panel cannot keep.
*/

/** A name as two records are compared by it: case, accents and extra spaces aside. */
function nameKey(column: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`lower(unaccent(regexp_replace(btrim(${column}), '[[:space:]]+', ' ', 'g')))`;
}

/** `c`'s phone was claimed by `o`, or the other way round: the refused save the index leaves behind. */
const SAME_PHONE = Prisma.sql`(o."phone" = c."claimedPhone" OR o."claimedPhone" = c."phone")`;

/**
 * `o` may be `c`: the same shop, another record, not both with an account — two sign-ins are two
 * people as far as a merge goes, and a flag the shopkeeper cannot act on is noise.
 */
const MAY_BE_SAME = Prisma.sql`
  o."storeId" = c."storeId"
  AND o."id" <> c."id"
  AND (c."userId" IS NULL OR o."userId" IS NULL)
  AND (${SAME_PHONE} OR ${nameKey(Prisma.sql`o."name"`)} = ${nameKey(Prisma.sql`c."name"`)})`;

/** A record lists this many at most: a common name should not turn it into a second customer list. */
const DUPLICATES_MAX = 20;

/** Of these records, the ones another record of the shop may be — the list's flag. */
export async function flaggedIdsOf(prisma: PrismaService, ids: readonly string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();

  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT DISTINCT c."id"
    FROM "customers" c
    JOIN "customers" o ON ${MAY_BE_SAME}
    WHERE c."id" = ANY(${[...ids]}::uuid[])`);
  return new Set(rows.map((row) => row.id));
}

interface DuplicateRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  hasAccount: boolean;
  ordersCount: number;
  reason: CustomerDuplicateReason;
}

/** The records that may be this one, the phone's reason first, then the one with more orders. */
export async function duplicatesOf(prisma: PrismaService, customerId: string): Promise<CustomerDuplicate[]> {
  const rows = await prisma.$queryRaw<DuplicateRow[]>(Prisma.sql`
    SELECT o."id", o."name", o."phone", u."email", (o."userId" IS NOT NULL) AS "hasAccount", o."ordersCount",
      CASE WHEN ${SAME_PHONE} THEN 'PHONE' ELSE 'NAME' END AS "reason"
    FROM "customers" c
    JOIN "customers" o ON ${MAY_BE_SAME}
    LEFT JOIN "users" u ON u."id" = o."userId"
    WHERE c."id" = ${customerId}::uuid
    ORDER BY ${SAME_PHONE} DESC, o."ordersCount" DESC, o."createdAt" DESC, o."id" DESC
    LIMIT ${DUPLICATES_MAX}`);

  return rows.map((row) => ({ ...row, ordersCount: Number(row.ordersCount) }) satisfies CustomerDuplicate);
}
