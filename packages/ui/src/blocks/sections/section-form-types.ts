/**
 * What the banner form holds while it is being filled in.
 *
 * All three destinations at once, and `""` where the wire carries null: a select cannot hold null,
 * and the screen turns it back. Only the one `target` names is sent — see the screen's `toPayload`.
 */
export type SectionFormLayout = "FULL" | "HALVES" | "THIRDS"
/**
 * Where on the page the banner lives.
 *
 * `HERO` is the top, before anything else; `BANNER` is the body. Two heroes in a row make a
 * carousel — the shape is read off how many there are, so there is no third value here saying so.
 */
export type SectionFormPlacement = "HERO" | "BANNER"
export type SectionFormWidth = "FULL" | "CONTAINED"
export type SectionFormTarget = "CATEGORY" | "PRODUCT" | "EXTERNAL" | "NONE"

export interface SectionFormValues {
  placement: SectionFormPlacement
  /** Read only on a hero: the body's posters are already inside the page's measure. */
  width: SectionFormWidth
  title: string
  subtitle: string
  imageUrl: string
  layout: SectionFormLayout
  target: SectionFormTarget
  categorySlug: string
  productSlug: string
  externalUrl: string
  isActive: boolean
}

/** One thing a banner may point at, as the pickers list it. The wire speaks in slugs. */
export interface SectionTargetOption {
  slug: string
  name: string
}

/** The empty banner, so the screen and the stories agree on what "new" looks like. */
export const EMPTY_BANNER: SectionFormValues = {
  placement: "BANNER",
  width: "FULL",
  title: "",
  subtitle: "",
  imageUrl: "",
  layout: "FULL",
  target: "CATEGORY",
  categorySlug: "",
  productSlug: "",
  externalUrl: "",
  isActive: true,
}
