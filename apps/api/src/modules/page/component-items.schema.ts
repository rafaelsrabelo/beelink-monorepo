// Libs
import { z } from 'zod';

// Types
import type {
  AnnouncementLink,
  BannerSlide,
  BenefitRow,
  ComponentItem,
  ComponentKind,
} from '@harness-monorepo/contracts';

// App
import { COMPONENT_URL_MAX_LENGTH } from './page.constants.js';

/**
 * What a component's `items` may hold, decided by its `kind`.
 *
 * It copies `store-layout-settings.schema.ts` one level up: a shape per kind, closed with
 * `satisfies`, refusing an undeclared key on the way in. The reason it is zod and not a
 * class-validator nested class is the same one that file states — the shape has to do two jobs
 * from one declaration, refusing bad input AND narrowing Prisma's `JsonValue` on the way out, and
 * a DTO class can only do the first.
 *
 * What is different, and what makes this safe where the layout blob was not: **`items` is
 * content**. A key nobody reads in `layoutSettings` is invisible, which is how sixteen of its
 * twenty-one survived unread. A slide nobody draws is a blank band on the shop's front page.
 */

/**
 * A destination, as an id. Shared by a slide and by the strip's link.
 *
 * Exactly one of the three, refined rather than left to a CHECK — `items` is JSON, so the
 * database cannot hold the rule the way it held it for the four columns this model dropped. The
 * refinement is where it lives instead, and it says the same thing: a thing that claims CATEGORY
 * has a category.
 */
const destination = {
  target: z.enum(['CATEGORY', 'PRODUCT', 'EXTERNAL', 'NONE']),
  categoryId: z.uuid().nullish(),
  productId: z.uuid().nullish(),
  externalUrl: z.url({ protocol: /^https?$/ }).max(COMPONENT_URL_MAX_LENGTH).nullish(),
};

const carriesWhatItNames = (row: {
  target: string;
  categoryId?: string | null;
  productId?: string | null;
  externalUrl?: string | null;
}) =>
  (row.target === 'CATEGORY' && !!row.categoryId) ||
  (row.target === 'PRODUCT' && !!row.productId) ||
  (row.target === 'EXTERNAL' && !!row.externalUrl) ||
  row.target === 'NONE';

/** One picture of a banner, with its destination as an id. */
const bannerSlide = z
  .strictObject({
    id: z.string().min(1).max(64),
    imageUrl: z.url({ protocol: /^https?$/ }).max(COMPONENT_URL_MAX_LENGTH),
    title: z.string().max(120).nullish(),
    subtitle: z.string().max(200).nullish(),
    ...destination,
  })
  .refine(carriesWhatItNames, { message: 'A slide must carry the destination its target names' }) satisfies z.ZodType<BannerSlide>;

/** Where the strip leads. Its words are the component's own; this is only the destination. */
const announcementLink = z
  .strictObject({ id: z.string().min(1).max(64), ...destination })
  .refine(carriesWhatItNames, { message: 'A link must carry the destination its target names' }) satisfies z.ZodType<AnnouncementLink>;

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

/** What a component with no items of its own holds, and what an unknown kind falls back to. */
const NOTHING = z.array(z.never()).length(0);

/**
 * The table, closed with `satisfies`. An eighth kind fails to compile here until it says what its
 * items are — even if the answer is "none", which is what four of the seven say.
 */
const ITEMS_OF = {
  /** One picture is a poster; several are a carousel. The count is the whole of that decision. */
  BANNER: z.array(bannerSlide).max(20),
  BENEFITS: z.array(benefitRow).max(12),
  /** At most one: the strip is one sentence, and one sentence leads one place. */
  ANNOUNCEMENT: z.array(announcementLink).max(1),
  // Nothing to hold. `.length(0)` and not `.max(0)` so the refusal names the count.
  HEADING: NOTHING,
  TEXT: NOTHING,
  CATEGORIES: NOTHING,
  PRODUCTS: NOTHING,
} as const satisfies Record<ComponentKind, z.ZodType>;

/**
 * The schema a write is checked against. The kind decides it.
 *
 * A kind this build does not know — a row written by a newer deploy, read by an older one during
 * a rollout — falls back to holding nothing rather than to `undefined`. Without the fallback the
 * read path threw on a landing page a stranger had asked for, which is the one thing
 * `parseComponentItems` promises never to do. Caught by a service test whose fixture had no kind.
 */
export function componentItemsFor(kind: ComponentKind): z.ZodType {
  return ITEMS_OF[kind] ?? NOTHING;
}

/**
 * The read path, and it never throws.
 *
 * A component whose stored items no longer parse — because a deploy narrowed the shape, or because
 * a row was written by a newer one — reads as an empty band rather than as a 500 on a page a
 * stranger asked for. The write path is strict; the read path is forgiving, which is the same
 * split `store-layout-settings.schema.ts` makes and for the same reason.
 */
export function parseComponentItems(kind: ComponentKind, raw: unknown): ComponentItem[] {
  const parsed = componentItemsFor(kind).safeParse(raw);

  return parsed.success ? (parsed.data as ComponentItem[]) : [];
}
