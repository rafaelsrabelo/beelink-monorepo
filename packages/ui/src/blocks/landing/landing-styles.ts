/**
 * What the landing's blocks share of its look (BEELINK-256). Class names only: a `.ts` beside the
 * blocks, so each stays one component per file.
 */

/**
 * The page's column: the design's 1440px with its 96px gutters, which narrow with the screen.
 *
 * The design's own width is written `90rem`, never `1440px`: Tailwind orders a breakpoint against
 * the named ones by its value, and a px one cannot be compared with their rems — it was emitted
 * before `xl`, and lost to it at the very width it was written for.
 */
export const LANDING_CONTAINER = "mx-auto w-full max-w-[1440px] px-6 md:px-10 xl:px-16 min-[90rem]:px-24"

/** The same gutters on a row that scrolls sideways: its first card lines up with the page's column. */
export const LANDING_SCROLL_GUTTER = "scroll-px-6 md:scroll-px-10 xl:scroll-px-16 min-[90rem]:scroll-px-24"

/**
 * The focus ring of everything under the element that carries this, in the colour `--landing-focus`
 * names. The ring is drawn outside the control, so its colour has to answer the ground the control
 * sits on, not the control: a black button's own colour is invisible on the black section, and so
 * was `outline-current` there. The shell sets the ink; a black ground sets `LANDING_FOCUS_ON_INK`,
 * and a light card inside one sets the ink back.
 *
 * `:where()` keeps it below a control's own `focus-visible:` classes, which may still move the ring.
 */
export const LANDING_FOCUS_RING =
  "[--landing-focus:var(--brand-ink)] [&_:where(:focus-visible)]:outline-2 [&_:where(:focus-visible)]:outline-offset-2 [&_:where(:focus-visible)]:outline-(--landing-focus)"
export const LANDING_FOCUS_ON_GROUND = "[--landing-focus:var(--brand-ink)]"
export const LANDING_FOCUS_ON_INK = "[--landing-focus:var(--brand-on-ink)]"

/** A pill button or link. It rises a little under the pointer — never for someone who asked for no motion. */
export const LANDING_CTA =
  "inline-flex items-center justify-center gap-2.5 rounded-full whitespace-nowrap transition motion-safe:hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-ink/20"

/** A card that rises under the pointer. */
export const LANDING_LIFT = "transition motion-safe:hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-brand-ink/10"

/** The courier's form, and what takes its place once it was sent: the light card on the black section. */
export const LANDING_COURIER_CARD =
  "relative flex w-full flex-col gap-[18px] self-center rounded-[32px] bg-brand-ground p-6 text-brand-ink shadow-2xl shadow-brand-ink/40 sm:p-9 xl:w-[460px] xl:shrink-0"

/** A field of that form: its label, its control and what is said under it, one to a line. */
export const LANDING_FIELD = "flex flex-col gap-1.5"
export const LANDING_FIELD_LABEL = "text-sm font-bold"
export const LANDING_INPUT = "h-[52px] rounded-[14px] border-[1.5px] border-brand-line-strong bg-brand-surface px-4 text-base font-normal aria-invalid:border-brand-danger"
export const LANDING_REFUSAL = "text-[13px] font-semibold text-brand-danger"

/**
 * The line a typed field's refusal is written on, kept while there is nothing to write. A refusal
 * arrives as the person leaves the field, and that is often a press on what stands below it: a line
 * that appeared then moved the checkbox and the legal links from under the pointer before the press
 * ended, and the click was lost.
 */
export const LANDING_REFUSAL_LINE = `min-h-4 leading-4 ${LANDING_REFUSAL}`

/** The typed fields, one under the other: the line each keeps is most of the room between them. */
export const LANDING_FIELDS = "flex flex-col gap-2.5"
