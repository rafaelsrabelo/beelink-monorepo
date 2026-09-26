// Types
import type {
  AnnouncementLink,
  BannerSlide,
  BenefitRow,
  CallToActionButton,
  ContactField,
  CountdownEnd,
  FaqItem,
  ImageTextMedia,
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
  buttonFromForm,
  countdownFromForm,
  countdownToForm,
  faqFromForm,
  faqToForm,
  fieldsFromForm,
  fieldsToForm,
  linkFromForm,
  linkToForm,
  mediaFromForm,
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
  const media = items("IMAGE_TEXT")[0] as ImageTextMedia | undefined
  const button = (items("CALL_TO_ACTION")[0] as CallToActionButton | undefined) ?? media?.button ?? undefined

  return {
    kind: component.kind,
    title: component.title ?? "",
    subtitle: component.subtitle ?? "",
    body: component.body ?? "",
    ...linkToForm((items("ANNOUNCEMENT")[0] as AnnouncementLink | undefined) ?? button),
    buttonLabel: button?.label ?? "",
    imageUrl: media?.imageUrl ?? "",
    imageAlt: media?.alt ?? "",
    slides: slidesToForm(items("BANNER") as BannerSlide[]),
    benefits: benefitsToForm(items("BENEFITS") as BenefitRow[]),
    fields: fieldsToForm(items("CONTACT") as ContactField[]),
    source: component.source ?? "ALL",
    sourceCategoryId: component.sourceCategoryId ?? "",
    // A featured product's pick is a showcase's, one long.
    picks: picksToForm((component.kind === "FEATURED_PRODUCT" ? items("FEATURED_PRODUCT") : items("PRODUCTS")) as ShowcaseProduct[]),
    limit: component.limit === null ? "" : String(component.limit),
    faq: faqToForm(items("FAQ") as FaqItem[]),
    countdownEnd: countdownToForm(items("COUNTDOWN") as CountdownEnd[]),
  }
}

/**
 * And back. An empty string is "no value", which on the wire is null. `itemId` is the id of a kind's
 * single item — the strip's link, a call to action's button, an image with text's picture — minted
 * once by the editor, so a
 * re-pointed link is the same link.
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
    case "FAQ":
      return { items: faqFromForm(value.faq) }
    case "CALL_TO_ACTION":
      return { items: buttonFromForm(value, itemId) }
    case "IMAGE_TEXT":
      return { items: mediaFromForm(value, itemId) }
    case "FEATURED_PRODUCT":
      return { items: value.picks.slice(0, 1) }
    case "COUNTDOWN":
      return { items: countdownFromForm(value.countdownEnd, itemId) }
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
