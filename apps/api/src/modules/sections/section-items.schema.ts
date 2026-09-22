// Libs
import { z } from 'zod';

// Types
import type { BenefitRow, SectionItem, SectionKind } from '@harness-monorepo/contracts';

// App
import { SECTION_URL_MAX_LENGTH } from './sections.constants.js';

/**
 * What a block's `items` may hold, decided by its `kind`.
 *
 * It copies `store-layout-settings.schema.ts` one level up: a shape per kind, closed with
 * `satisfies`, refusing an undeclared key on the way in. The reason it is zod and not a
 * class-validator nested class is the same one that file states — the shape has to do two jobs
 * from one declaration, refusing bad input AND narrowing Prisma's `JsonValue` on the way out, and
 * a DTO class can only do the first.
 *
 * What is different, and what makes this safe where the layout blob was not: **`items` is
 * content**. A key nobody reads in `layoutSettings` is invisible, which is how sixteen of its
 * twenty-one survived unread. A slide nobody draws is a blank cover on the shop's front page.
 */

const benefitRow = z.strictObject({
  id: z.string().min(1).max(64),
  /**
   * A name from the closed table in `packages/ui`, never a URL and never a component — the same
   * rule `StoreCategory.icon` already states. It is not checked against that table here: the table
   * lives in the design system, and an API that had to be redeployed to add an icon would be an
   * API coupled to a stylesheet. A name the web does not know draws the default.
   */
  icon: z.string().min(1).max(40),
  title: z.string().min(1).max(60),
  detail: z.string().max(120).nullish(),
}) satisfies z.ZodType<BenefitRow>;

/**
 * The table, closed with `satisfies`. A sixth kind fails to compile here until it says what its
 * items are — even if the answer is "none", which is what the three below say.
 */
const ITEMS_OF = {
  BENEFITS: z.array(benefitRow).max(12),
  // Nothing to hold. `.length(0)` and not `.max(0)` so the refusal names the count.
  //
  // A hero is on this side of the line, and that is the change a slide could not survive: it keeps
  // its picture in `imageUrl` and its destination in a foreign key, like the banner it is. Two
  // heroes in a row are a carousel because there are two of them, not because a column said so.
  HERO: z.array(z.never()).length(0),
  BANNER: z.array(z.never()).length(0),
  TEXT: z.array(z.never()).length(0),
  CATEGORIES: z.array(z.never()).length(0),
  PRODUCTS: z.array(z.never()).length(0),
} as const satisfies Record<SectionKind, z.ZodType>;

/** The schema a write is checked against. The kind decides it. */
export function sectionItemsFor(kind: SectionKind): z.ZodType {
  return ITEMS_OF[kind];
}

/**
 * The read path, and it never throws.
 *
 * A block whose stored items no longer parse — because a deploy narrowed the shape, or because a
 * row was written by a newer one — reads as an empty band rather than as a 500 on a page a
 * stranger asked for. The write path is strict; the read path is forgiving, which is the same
 * split `store-layout-settings.schema.ts` makes and for the same reason.
 */
export function parseSectionItems(kind: SectionKind, raw: unknown): SectionItem[] {
  const parsed = sectionItemsFor(kind).safeParse(raw);

  return parsed.success ? (parsed.data as SectionItem[]) : [];
}
