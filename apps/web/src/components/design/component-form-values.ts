// Types
import type {
  AnnouncementLink,
  BannerSlide,
  BenefitRow,
  ContactField,
  StoreComponent,
  UpdateComponentPayload,
} from "@harness-monorepo/contracts"

// UI
import type { ComponentFormValues } from "@harness-monorepo/ui/blocks/design/component-form"
import { defaultAlignOf } from "@harness-monorepo/ui/blocks/design/text-align"

/*
  A component between the wire and its form, in both directions. Apart from the sheet that draws
  it because each kind adds a clause to both, and the sheet had passed the line limit.
*/

/** The format the form offers for this kind, marked; the kind's own when the wire holds none. */
function displayOf(component: StoreComponent): ComponentFormValues["display"] {
  if (component.kind === "CATEGORIES") return component.display === "RAIL" ? "RAIL" : "GRID"

  return component.display === "GRID" ? "GRID" : "CAROUSEL"
}

/** The wire's nulls become the form's empty strings, which is the only shape an input can hold. */
export function toForm(component: StoreComponent, bandBackground: string | null): ComponentFormValues {
  const link = component.kind === "ANNOUNCEMENT" ? (component.items[0] as AnnouncementLink | undefined) : undefined

  return {
    kind: component.kind,
    title: component.title ?? "",
    subtitle: component.subtitle ?? "",
    body: component.body ?? "",
    // A banner's two, and the categories'. A showcase's is its own editor's to hold; null on every
    // other kind, and the form holds one regardless. Null on the categories is the grid they drew.
    display: displayOf(component),
    columns: component.columns ?? 0,
    // Resolved for the form, so the toggle marks one; a null on the wire is the kind's own habit.
    align: component.align ?? defaultAlignOf(component.kind),
    background: bandBackground ?? "",
    target: link?.target ?? "NONE",
    categoryId: link?.categoryId ?? "",
    productId: link?.productId ?? "",
    externalUrl: link?.externalUrl ?? "",
    slides:
      component.kind === "BANNER"
        ? (component.items as BannerSlide[]).map((slide) => ({
            id: slide.id,
            imageUrl: slide.imageUrl,
            title: slide.title ?? "",
            subtitle: slide.subtitle ?? "",
            target: slide.target,
            categoryId: slide.categoryId ?? "",
            productId: slide.productId ?? "",
            externalUrl: slide.externalUrl ?? "",
          }))
        : [],
    benefits:
      component.kind === "BENEFITS"
        ? (component.items as BenefitRow[]).map((row) => ({
            id: row.id,
            icon: row.icon,
            title: row.title,
            detail: row.detail ?? "",
          }))
        : [],
    fields:
      component.kind === "CONTACT"
        ? (component.items as ContactField[]).map((field) => ({
            id: field.id,
            label: field.label,
            type: field.type,
            required: field.required,
            options: (field.options ?? []).join("\n"),
          }))
        : [],
  }
}

/**
 * And back. An empty string is "no value", which on the wire is null.
 *
 * A slide keeps only the destination its target names: the form holds all three so a shopkeeper
 * who changes their mind does not lose what they typed, and the API refuses a slide carrying two.
 * A slide with no picture is dropped rather than sent — the API would refuse the whole save over
 * it, and a card the owner never filled in is not a mistake they meant to make.
 */
export function toPayload(value: ComponentFormValues, linkId: string): UpdateComponentPayload {
  const slides: BannerSlide[] = value.slides
    .filter((slide) => slide.imageUrl.trim())
    .map((slide) => ({
      id: slide.id,
      imageUrl: slide.imageUrl.trim(),
      title: slide.title.trim() || null,
      subtitle: slide.subtitle.trim() || null,
      target: slide.target,
      categoryId: slide.target === "CATEGORY" ? slide.categoryId || null : null,
      productId: slide.target === "PRODUCT" ? slide.productId || null : null,
      externalUrl: slide.target === "EXTERNAL" ? slide.externalUrl.trim() || null : null,
    }))

  // The strip's one link, kept only when it names somewhere: "nowhere" is an empty list, not a
  // row that says NONE, so a strip that never pointed anywhere holds nothing to resolve.
  const link: AnnouncementLink[] =
    value.target === "NONE"
      ? []
      : [
          {
            id: linkId,
            target: value.target,
            categoryId: value.target === "CATEGORY" ? value.categoryId || null : null,
            productId: value.target === "PRODUCT" ? value.productId || null : null,
            externalUrl: value.target === "EXTERNAL" ? value.externalUrl.trim() || null : null,
          },
        ]

  const benefits: BenefitRow[] = value.benefits
    .filter((row) => row.title.trim())
    .map((row) => ({ id: row.id, icon: row.icon, title: row.title.trim(), detail: row.detail.trim() || null }))

  // A question with no words is one the owner has not written yet, and the API refuses it; a list
  // keeps only its non-empty choices, and only a list keeps any.
  const fields: ContactField[] = value.fields
    .filter((field) => field.label.trim())
    .map((field) => ({
      id: field.id,
      label: field.label.trim(),
      type: field.type,
      required: field.required,
      ...(field.type === "SELECT"
        ? { options: field.options.split("\n").map((option) => option.trim()).filter(Boolean) }
        : {}),
    }))

  return {
    title: value.title.trim() || null,
    subtitle: value.subtitle.trim() || null,
    body: value.body.trim() || null,
    columns: value.columns || null,
    align: value.align,
    // `display` only where the form offers it: the API refuses a value on a kind that does not draw one.
    ...(value.kind === "BANNER" ? { items: slides, display: value.display } : {}),
    ...(value.kind === "CATEGORIES" ? { display: value.display } : {}),
    ...(value.kind === "BENEFITS" ? { items: benefits } : {}),
    ...(value.kind === "ANNOUNCEMENT" ? { items: link } : {}),
    ...(value.kind === "CONTACT" ? { items: fields } : {}),
  }
}
