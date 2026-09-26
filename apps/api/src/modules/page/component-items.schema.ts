// Libs
import { z } from 'zod';

// Types
import type {
  AnnouncementLink,
  BannerSlide,
  BenefitRow,
  CallToActionButton,
  ComponentItem,
  ComponentKind,
  FaqItem,
  ImageTextMedia,
  ShowcaseProduct,
} from '@harness-monorepo/contracts';

// App
import { carriesWhatItNames, componentLink, destination } from './component-destination.schema.js';
import { contactForm } from './contact-fields.schema.js';
import {
  COMPONENT_URL_MAX_LENGTH,
  FAQ_ANSWER_MAX_LENGTH,
  FAQ_ITEMS_MAX,
  FAQ_QUESTION_MAX_LENGTH,
  IMAGE_ALT_MAX_LENGTH,
  SHOWCASE_LIMIT_MAX,
} from './page.constants.js';

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

/**
 * One product of a hand-picked showcase, by id: the price and the picture are read when the page is.
 * Whether the id is this shop's is `PageRules`' question, because it needs the database.
 */
const showcaseProduct = z.strictObject({
  id: z.string().min(1).max(64),
  productId: z.uuid(),
}) satisfies z.ZodType<ShowcaseProduct>;

const showcaseSelection = z
  .array(showcaseProduct)
  .max(SHOWCASE_LIMIT_MAX)
  .refine((rows) => new Set(rows.map((row) => row.productId)).size === rows.length, {
    message: 'O mesmo produto duas vezes na vitrine',
  });

/** One question and its answer. Both required: a question with no answer is one not finished. */
const faqItem = z.strictObject({
  id: z.string().min(1).max(64),
  question: z.string().trim().min(1).max(FAQ_QUESTION_MAX_LENGTH),
  answer: z.string().trim().min(1).max(FAQ_ANSWER_MAX_LENGTH),
}) satisfies z.ZodType<FaqItem>;

const faqItems = z
  .array(faqItem)
  .max(FAQ_ITEMS_MAX)
  .refine((rows) => new Set(rows.map((row) => row.id)).size === rows.length, {
    message: 'Duas perguntas com o mesmo id',
  });

/** A call to action's button: its words and where it leads. */
const callToActionButton = z
  .strictObject({ id: z.string().min(1).max(64), ...componentLink })
  .refine(carriesWhatItNames, { message: 'A button must carry the destination its target names' }) satisfies z.ZodType<CallToActionButton>;

/** An image with text's picture, what it shows, and the button beside the words if there is one. */
const imageTextMedia = z.strictObject({
  id: z.string().min(1).max(64),
  imageUrl: z.url({ protocol: /^https?$/ }).max(COMPONENT_URL_MAX_LENGTH),
  alt: z.string().trim().max(IMAGE_ALT_MAX_LENGTH).nullish(),
  button: z
    .strictObject(componentLink)
    .refine(carriesWhatItNames, { message: 'A button must carry the destination its target names' })
    .nullish(),
}) satisfies z.ZodType<ImageTextMedia>;

/** What a component with no items of its own holds, and what an unknown kind falls back to. */
const NOTHING = z.array(z.never()).length(0);

/**
 * The table, closed with `satisfies`. A ninth kind fails to compile here until it says what its
 * items are — even if the answer is "none", which is what three of the eight say.
 */
const ITEMS_OF = {
  /** A banner's pictures. Whether they take turns or share the space is its `display`, not their count. */
  BANNER: z.array(bannerSlide).max(20),
  BENEFITS: z.array(benefitRow).max(12),
  /** At most one: the strip is one sentence, and one sentence leads one place. */
  ANNOUNCEMENT: z.array(announcementLink).max(1),
  CONTACT: contactForm,
  /** The products a SELECTION showcase draws, in order; empty for every other source. */
  PRODUCTS: showcaseSelection,
  /** The questions, in the order the page draws them. */
  FAQ: faqItems,
  /** At most one: a call to action asks one thing. None is a block with no button. */
  CALL_TO_ACTION: z.array(callToActionButton).max(1),
  /** At most one picture. None is the words alone. */
  IMAGE_TEXT: z.array(imageTextMedia).max(1),
  /** The one product, picked as a showcase picks: an id, read when the page is. None is not chosen yet. */
  FEATURED_PRODUCT: z.array(showcaseProduct).max(1),
  // Nothing to hold. `.length(0)` and not `.max(0)` so the refusal names the count.
  HEADING: NOTHING,
  TEXT: NOTHING,
  CATEGORIES: NOTHING,
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
