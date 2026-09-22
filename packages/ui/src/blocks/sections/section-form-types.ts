/**
 * What the banner form holds while it is being filled in.
 *
 * All three destinations at once, and `""` where the wire carries null: a select cannot hold null,
 * and the screen turns it back. Only the one `target` names is sent — see the screen's `toPayload`.
 */
export type SectionFormLayout = "FULL" | "HALVES" | "THIRDS"
export type SectionFormTarget = "CATEGORY" | "PRODUCT" | "EXTERNAL" | "NONE"

export interface SectionFormValues {
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
