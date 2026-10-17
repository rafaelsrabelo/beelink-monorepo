// Nest
import { NotFoundException } from '@nestjs/common';

// Types
import type { StoreErrorCode, StoreMovedDetails, StoreSlugMove, StoreSlugUnavailableReason } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { brasiliaDayOf, daysAfter, openOfBrasiliaDay } from '../billing/billing-dates.js';
import { RESERVED_SLUGS, SLUG_CHANGE_INTERVAL_DAYS, SLUG_MAX_LENGTH, SLUG_MIN_LENGTH, SLUG_PATTERN } from './stores.constants.js';

/*
  Which address is whose (BEELINK-331). A page holds the address it has now (`stores.slug`) and every
  one it left (`store_slug_history`); an address is free only when neither table names it for another
  page.

  Taking one — a page created with it, or a page changing to it — is a claim: the address's advisory
  lock is held until the claiming transaction ends, and only then are both tables asked, in one
  statement. Two claims of one address wait for each other, and the second finds the first. Leaving
  an address needs no lock: the page holds it until its transaction commits and the history holds it
  from then on, and one statement never sees both empty. The unique index on `stores.slug` and the
  history's key stand behind it all.
*/

type Db = Prisma.TransactionClient;

/** Takes the address's lock for the rest of the caller's transaction. Every claim of an address takes it first. */
export async function lockSlug(tx: Db, slug: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`store-slug:${slug}`}, 0))`;
}

/**
 * Whether the address is taken for `page` — held by any page now, or left by another one. Without a
 * page, by anyone at all: what a new page is asked. One statement, so both tables are read at one instant.
 */
export async function slugTaken(db: Db, slug: string, page: string | null = null): Promise<boolean> {
  const [row] = await db.$queryRaw<{ taken: boolean }[]>`
    SELECT EXISTS (SELECT 1 FROM "stores" WHERE "slug" = ${slug})
        OR EXISTS (SELECT 1 FROM "store_slug_history" WHERE "slug" = ${slug} AND "storeId" IS DISTINCT FROM ${page}::uuid) AS "taken"`;

  return row?.taken === true;
}

/** The address a page has now, for an address it left; null for one no page ever left. */
export async function movedTo(db: Db, slug: string): Promise<string | null> {
  const row = await db.storeSlugHistory.findUnique({ where: { slug }, select: { store: { select: { slug: true } } } });

  return row?.store.slug ?? null;
}

/**
 * What a route answers for an address no page holds: `STORE_MOVED` and where the page is now, when a
 * page left it, else `STORE_NOT_FOUND`. The one place that decides it — every lookup of a page by its
 * address in `StoresService` throws this.
 */
export async function missingStore(db: Db, slug: string): Promise<NotFoundException> {
  const moved = await movedTo(db, slug);
  const errorCode: StoreErrorCode = moved ? 'STORE_MOVED' : 'STORE_NOT_FOUND';

  if (moved) return new NotFoundException({ errorCode, message: `"${slug}" is an address its page left`, details: { slug: moved } satisfies StoreMovedDetails });
  return new NotFoundException({ errorCode, message: `No shop at "${slug}"` });
}

/** Every address a page left, with the one it has now: the web leads the first to the second. */
export async function slugMoves(db: Db): Promise<StoreSlugMove[]> {
  const rows = await db.storeSlugHistory.findMany({ select: { slug: true, store: { select: { slug: true } } }, orderBy: { slug: 'asc' } });

  return rows.map((row) => ({ from: row.slug, to: row.store.slug }) satisfies StoreSlugMove);
}

/**
 * What is wrong with an already normalised address before anyone is asked: the creation's rules —
 * the pattern, the length, the app's own routes. Null when nothing is.
 */
export function slugProblemOf(slug: string): Extract<StoreSlugUnavailableReason, 'INVALID' | 'RESERVED'> | null {
  if (slug.length < SLUG_MIN_LENGTH || slug.length > SLUG_MAX_LENGTH || !SLUG_PATTERN.test(slug)) return 'INVALID';
  if (RESERVED_SLUGS.includes(slug)) return 'RESERVED';
  return null;
}

/**
 * The first day, `YYYY-MM-DD` on Brasília's calendar, a page whose address changed at `changedAt` may
 * change it again — `SLUG_CHANGE_INTERVAL_DAYS` after the day it changed, from that day's first
 * instant — or null when it may now. A page that never changed may at once.
 */
export function slugChangeableOn(changedAt: Date | null, now: Date): string | null {
  if (!changedAt) return null;

  const day = daysAfter(brasiliaDayOf(changedAt), SLUG_CHANGE_INTERVAL_DAYS);
  return now.getTime() >= openOfBrasiliaDay(day).getTime() ? null : day;
}

/** The normalisation every address goes through before a rule reads it: `CreateStoreDto`'s, the legacy `generateSlug()`. */
export function normaliseSlugText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
