// Types
import type { AnnouncementLink, BannerSlide, BenefitRow, ContactField, ShowcaseProduct } from "@harness-monorepo/contracts"

// UI
import type { ComponentFormValues } from "@harness-monorepo/ui/blocks/design/component-content-fields"

/*
  Each kind's items between the wire and the form, in both directions. Apart from `toForm` and
  `toPayload`, which only say which of these a kind reads, so a kind's converters sit together.
*/

type Link = Pick<ComponentFormValues, "target" | "categoryId" | "productId" | "externalUrl">

/** A link's destination as the form holds it: all three kept, so changing one's mind loses nothing. */
export function linkToForm(link: AnnouncementLink | undefined): Link {
  return {
    target: link?.target ?? "NONE",
    categoryId: link?.categoryId ?? "",
    productId: link?.productId ?? "",
    externalUrl: link?.externalUrl ?? "",
  }
}

/**
 * The strip's one link, kept only when it names somewhere: "nowhere" is an empty list, not a row
 * that says NONE, so a strip that never pointed anywhere holds nothing to resolve.
 */
export function linkFromForm(value: Link, itemId: string): AnnouncementLink[] {
  if (value.target === "NONE") return []

  return [
    {
      id: itemId,
      target: value.target,
      categoryId: value.target === "CATEGORY" ? value.categoryId || null : null,
      productId: value.target === "PRODUCT" ? value.productId || null : null,
      externalUrl: value.target === "EXTERNAL" ? value.externalUrl.trim() || null : null,
    },
  ]
}

export function slidesToForm(items: readonly BannerSlide[]): ComponentFormValues["slides"] {
  return items.map((slide) => ({
    id: slide.id,
    imageUrl: slide.imageUrl,
    title: slide.title ?? "",
    subtitle: slide.subtitle ?? "",
    target: slide.target,
    categoryId: slide.categoryId ?? "",
    productId: slide.productId ?? "",
    externalUrl: slide.externalUrl ?? "",
  }))
}

/**
 * A slide keeps only the destination its target names: the form holds all three so a shopkeeper
 * who changes their mind does not lose what they typed, and the API refuses a slide carrying two.
 * A slide with no picture is dropped rather than sent — the API would refuse the whole save over
 * it, and a card the owner never filled in is not a mistake they meant to make.
 */
export function slidesFromForm(slides: ComponentFormValues["slides"]): BannerSlide[] {
  return slides
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
}

export function benefitsToForm(items: readonly BenefitRow[]): ComponentFormValues["benefits"] {
  return items.map((row) => ({ id: row.id, icon: row.icon, title: row.title, detail: row.detail ?? "" }))
}

export function benefitsFromForm(rows: ComponentFormValues["benefits"]): BenefitRow[] {
  return rows
    .filter((row) => row.title.trim())
    .map((row) => ({ id: row.id, icon: row.icon, title: row.title.trim(), detail: row.detail.trim() || null }))
}

export function fieldsToForm(items: readonly ContactField[]): ComponentFormValues["fields"] {
  return items.map((field) => ({
    id: field.id,
    label: field.label,
    type: field.type,
    required: field.required,
    options: (field.options ?? []).join("\n"),
  }))
}

/**
 * A question with no words is one the owner has not written yet, and the API refuses it; a list
 * keeps only its non-empty choices, and only a list keeps any.
 */
export function fieldsFromForm(fields: ComponentFormValues["fields"]): ContactField[] {
  return fields
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
}

export function picksToForm(items: readonly ShowcaseProduct[]): ComponentFormValues["picks"] {
  return items.map((row) => ({ id: row.id, productId: row.productId }))
}
