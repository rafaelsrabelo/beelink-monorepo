// Types
import type { AffiliateSlugAvailability, AffiliateSlugUnavailableReason } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { slugify } from '../../shared/slug.js';
import { RESERVED_PATH_SEGMENTS } from '../catalog/catalog.constants.js';
import { shopSegmentHolder } from '../catalog/shop-segments.js';
import { SLUG_MAX_LENGTH, SLUG_MIN_LENGTH, SLUG_PATTERN } from '../stores/stores.constants.js';

/*
  An affiliate's `/name` (IMPULSEIA-103): a segment of the shop's own addresses, `/<shop>/<name>`,
  read after its route words and its categories. Normalised as a category's slug is, shaped as a
  shop's — 3 to 40 of a-z, 0-9 and inner hyphens — and never a route word, a category's, now or
  before a rename, or another affiliate's of the same shop. Unique there for good: an ended
  affiliate keeps theirs, so a link of theirs never credits anyone else.
*/

type Db = Prisma.TransactionClient;

/** What is wrong with an already normalised `/name` before anyone is asked; null when nothing is. */
export function slugProblemOf(slug: string): Extract<AffiliateSlugUnavailableReason, 'INVALID' | 'RESERVED'> | null {
  if (slug.length < SLUG_MIN_LENGTH || slug.length > SLUG_MAX_LENGTH || !SLUG_PATTERN.test(slug)) return 'INVALID';
  if (RESERVED_PATH_SEGMENTS.includes(slug)) return 'RESERVED';
  return null;
}

/** Whether a `/name` can be this affiliate's in the shop, as they would keep it. Read without the lock: the claim asks again under it. */
export async function slugAvailability(db: Db, storeId: string, raw: string, affiliateId: string): Promise<AffiliateSlugAvailability> {
  const slug = slugify(raw);
  const problem = slugProblemOf(slug);
  if (problem) return { slug, available: false, reason: problem };
  const holder = await shopSegmentHolder(db, storeId, slug, { affiliateId });
  return holder ? { slug, available: false, reason: 'TAKEN' } : { slug, available: true, reason: null };
}

/** A `/name` free now from the affiliate's own: the whole name, the first name, then the first name numbered. */
export async function suggestedSlugOf(db: Db, storeId: string, name: string, affiliateId: string): Promise<string | null> {
  const whole = slugify(name);
  const first = slugify(name.trim().split(/\s+/)[0] ?? '');
  const candidates = [...new Set([whole, first, ...[2, 3, 4, 5].map((n) => `${first}-${n}`)])];

  for (const candidate of candidates) {
    if ((await slugAvailability(db, storeId, candidate, affiliateId)).available) return candidate;
  }
  return null;
}
