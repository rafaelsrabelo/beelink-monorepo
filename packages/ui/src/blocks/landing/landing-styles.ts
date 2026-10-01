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

/** A pill button or link. It rises a little under the pointer — never for someone who asked for no motion. */
export const LANDING_CTA =
  "inline-flex items-center justify-center gap-2.5 rounded-full whitespace-nowrap transition motion-safe:hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-ink/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"

/** A card that rises under the pointer. */
export const LANDING_LIFT = "transition motion-safe:hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-brand-ink/10"
