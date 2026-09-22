// Libs
import { z } from 'zod';

// Types
import type { BenefitRow, HeroSlide, SectionItem, SectionKind } from '@harness-monorepo/contracts';

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

/**
 * One slide of the hero, with its destination as an id.
 *
 * Exactly one of the three destinations, refined rather than left to a CHECK — `items` is JSON, so
 * the database cannot hold the rule the way it holds it for a banner's columns. The refinement is
 * where it lives instead, and it says the same thing: a slide that claims CATEGORY has a category.
 */
const heroSlide = z
  .strictObject({
    id: z.string().min(1).max(64),
    imageUrl: z.url({ protocol: /^https?$/ }).max(SECTION_URL_MAX_LENGTH),
    title: z.string().max(120).nullish(),
    subtitle: z.string().max(200).nullish(),
    target: z.enum(['CATEGORY', 'PRODUCT', 'EXTERNAL', 'NONE']),
    categoryId: z.uuid().nullish(),
    productId: z.uuid().nullish(),
    externalUrl: z.url({ protocol: /^https?$/ }).max(SECTION_URL_MAX_LENGTH).nullish(),
  })
  .refine(
    (slide) =>
      (slide.target === 'CATEGORY' && !!slide.categoryId) ||
      (slide.target === 'PRODUCT' && !!slide.productId) ||
      (slide.target === 'EXTERNAL' && !!slide.externalUrl) ||
      slide.target === 'NONE',
    { message: 'A slide must carry the destination its target names' },
  ) satisfies z.ZodType<HeroSlide>;

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
/** What a block with no items of its own holds, and what an unknown kind falls back to. */
const NOTHING = z.array(z.never()).length(0);

const ITEMS_OF = {
  BENEFITS: z.array(benefitRow).max(12),
  // Nothing to hold. `.length(0)` and not `.max(0)` so the refusal names the count.
  //
  // A hero is on this side of the line, and that is the change a slide could not survive: it keeps
  // its picture in `imageUrl` and its destination in a foreign key, like the banner it is. Two
  // heroes in a row are a carousel because there are two of them, not because a column said so.
  ANNOUNCEMENT: NOTHING,
  // One picture is a cover; several are a carousel. The count is the whole of that decision.
  HERO: z.array(heroSlide).max(20),
  BANNER: NOTHING,
  TEXT: NOTHING,
  CATEGORIES: NOTHING,
  PRODUCTS: NOTHING,
} as const satisfies Record<SectionKind, z.ZodType>;

/**
 * The schema a write is checked against. The kind decides it.
 *
 * A kind this build does not know — a row written by a newer deploy, read by an older one during
 * a rollout — falls back to holding nothing rather than to `undefined`. Without the fallback the
 * read path threw on a landing page a stranger had asked for, which is the one thing
 * `parseSectionItems` promises never to do. Caught by a service test whose fixture had no kind.
 */
export function sectionItemsFor(kind: SectionKind): z.ZodType {
  return ITEMS_OF[kind] ?? NOTHING;
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
