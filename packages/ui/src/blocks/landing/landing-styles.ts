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
