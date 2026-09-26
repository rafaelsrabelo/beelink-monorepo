// Types
import type {
  AnnouncementLink,
  BannerSlide,
  BenefitRow,
  ContactField,
  ShowcaseProduct,
  StoreComponent,
  UpdateComponentPayload,
} from "@harness-monorepo/contracts"

// UI
import type { ComponentFormValues } from "@harness-monorepo/ui/blocks/design/component-content-fields"

// App
import {
  benefitsFromForm,
  benefitsToForm,
  fieldsFromForm,
  fieldsToForm,
  linkFromForm,
  linkToForm,
  picksToForm,
  slidesFromForm,
  slidesToForm,
} from "./component-form-items"

/*
  A component's content between the wire and its Conteúdo tab, in both directions. Apart from the
  panel that draws it because each kind adds a clause to both, and the panel had passed the line
  limit. How the block sits — its format, columns and alignment — is not here: that is the draft's.
*/

/** The wire's nulls become the form's empty strings, which is the only shape an input can hold. */
export function toForm(component: StoreComponent): ComponentFormValues {
  const items = (kind: StoreComponent["kind"]) => (component.kind === kind ? component.items : [])

  return {
    kind: component.kind,
    title: component.title ?? "",
    subtitle: component.subtitle ?? "",
    body: component.body ?? "",
    ...linkToForm(items("ANNOUNCEMENT")[0] as AnnouncementLink | undefined),
    slides: slidesToForm(items("BANNER") as BannerSlide[]),
    benefits: benefitsToForm(items("BENEFITS") as BenefitRow[]),
    fields: fieldsToForm(items("CONTACT") as ContactField[]),
    source: component.source ?? "ALL",
    sourceCategoryId: component.sourceCategoryId ?? "",
    picks: picksToForm(items("PRODUCTS") as ShowcaseProduct[]),
    limit: component.limit === null ? "" : String(component.limit),
  }
}

/**
 * And back. An empty string is "no value", which on the wire is null. `itemId` is the id of a kind's
 * single item — the strip's link — minted once by the editor, so a re-pointed link is the same link.
 */
export function toPayload(value: ComponentFormValues, itemId: string): UpdateComponentPayload {
  return {
    title: value.title.trim() || null,
    subtitle: value.subtitle.trim() || null,
    body: value.body.trim() || null,
    ...itemsOf(value, itemId),
  }
}

/** The items a kind sends; none for a kind that holds none, or whose items are not the form's. */
function itemsOf(value: ComponentFormValues, itemId: string): UpdateComponentPayload {
  switch (value.kind) {
    case "BANNER":
      return { items: slidesFromForm(value.slides) }
    case "PRODUCTS":
      return showcaseOf(value)
    case "BENEFITS":
      return { items: benefitsFromForm(value.benefits) }
    case "ANNOUNCEMENT":
      return { items: linkFromForm(value, itemId) }
    case "CONTACT":
      return { items: fieldsFromForm(value.fields) }
    default:
      return {}
  }
}

/**
 * A showcase's own fields, sent whole: the source, and only what that source reads. The form keeps
 * the others so switching back finds them; the API would clear them anyway, and sending a pick with
 * a category source would only be a pick it has to check against the shop for nothing.
 */
function showcaseOf(value: ComponentFormValues): UpdateComponentPayload {
  const limit = value.limit.trim()

  return {
    source: value.source,
    sourceCategoryId: value.source === "CATEGORY" ? value.sourceCategoryId || null : null,
    limit: limit === "" ? null : Number(limit),
    items: value.source === "SELECTION" ? value.picks : [],
  }
}
