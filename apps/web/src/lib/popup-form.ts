// Types
import type { FirstPurchaseHeadline, StorePopupOverview, StorePopupPayload } from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { POPUP_BENEFIT_AUTO, type PopupAnnouncing, type PopupBenefitChoice, type PopupFormIssues, type PopupFormValues } from "@harness-monorepo/ui/lib/popup-form"
import { offerBenefitWords } from "@harness-monorepo/ui/lib/shop-offers"
import { POPUP_BENEFIT_PLACEHOLDER, POPUP_BUTTON_MAX, POPUP_DELAY_MAX_SECONDS, POPUP_TEXT_MAX, POPUP_TITLE_MAX, popupWordsOf, typedDiscountIn, type PopupCopyValue, type PopupWords } from "@harness-monorepo/ui/lib/shop-popup"
import { format } from "@harness-monorepo/ui/locales/index"

/**
 * The crossing between the pop-up's form (BEELINK-306) — strings, as typed — and the wire, and what
 * the form says of itself while it is typed: what it would announce, and the words a visitor would
 * read. The rules are the API's own; saying them here first spares a round trip, and the API still
 * has the last word.
 */

type Text = UiMessages["discounts"]["popup"]

const DEFAULT_DELAY_SECONDS = 5
const WHOLE = /^\d{1,2}$/

const choiceOf = (source: "PROMOTION" | "COUPON", id: string) => `${source}:${id}`

export function popupFormOf(settings: StorePopupOverview["settings"]): PopupFormValues {
  return {
    enabled: settings.enabled,
    imageUrl: settings.imageUrl ?? "",
    title: settings.title ?? "",
    text: settings.text ?? "",
    buttonLabel: settings.buttonLabel ?? "",
    trigger: settings.trigger,
    delay: String(settings.delaySeconds),
    benefit: settings.benefitSource === "AUTO" || !settings.benefitId ? POPUP_BENEFIT_AUTO : choiceOf(settings.benefitSource, settings.benefitId),
  }
}

/** A sentence as the API keeps it: trimmed, and nothing typed is the default. */
const sentenceOf = (typed: string) => typed.trim() || null

function delayOf(typed: string): number | null {
  const trimmed = typed.trim()
  const seconds = WHOLE.test(trimmed) ? Number(trimmed) : -1
  return seconds >= 0 && seconds <= POPUP_DELAY_MAX_SECONDS ? seconds : null
}

function benefitOf(choice: string): Pick<StorePopupPayload, "benefitSource" | "benefitId"> {
  const [source, id] = choice.split(":")
  return (source === "PROMOTION" || source === "COUPON") && id ? { benefitSource: source, benefitId: id } : { benefitSource: "AUTO", benefitId: null }
}

/**
 * The form as the API takes it, or what to correct, field by field. A sentence is refused for a
 * discount typed by hand before it is for its length: that one says what to write instead. The
 * delay is asked for only where it is read — on leaving, one that does not hold is sent as the default.
 */
export function popupPayloadOf(value: PopupFormValues, text: Text["issues"]): { payload: StorePopupPayload } | { issues: PopupFormIssues } {
  const sentence = (typed: string, max: number, tooLong: string) => (typedDiscountIn(typed) ? text.typedDiscount : [...typed.trim()].length > max ? tooLong : undefined)
  const delay = delayOf(value.delay)
  const found = {
    title: sentence(value.title, POPUP_TITLE_MAX, text.title),
    text: sentence(value.text, POPUP_TEXT_MAX, text.text),
    buttonLabel: sentence(value.buttonLabel, POPUP_BUTTON_MAX, text.buttonLabel),
    delay: value.trigger === "ON_ARRIVAL" && delay === null ? text.delay : undefined,
  }
  const issues = Object.fromEntries(Object.entries(found).filter(([, issue]) => issue !== undefined)) as PopupFormIssues
  if (Object.keys(issues).length > 0) return { issues }

  return {
    payload: {
      enabled: value.enabled,
      imageUrl: value.imageUrl.trim() || null,
      title: sentenceOf(value.title),
      text: sentenceOf(value.text),
      buttonLabel: sentenceOf(value.buttonLabel),
      trigger: value.trigger,
      delaySeconds: delay ?? DEFAULT_DELAY_SECONDS,
      ...benefitOf(value.benefit),
    },
  }
}

/**
 * What the pop-up may announce, worded: following the shop, then each promotion and coupon in
 * force. A choice saved that is no longer in force stays in the list, said as what it is — the
 * select must show what is saved, not silently fall on another.
 */
export function popupChoicesOf(overview: Pick<StorePopupOverview, "options">, chosen: string, locale: string, messages: UiMessages): PopupBenefitChoice[] {
  const text = messages.discounts.popup
  const named = overview.options.map((option) => ({
    value: choiceOf(option.source, option.id),
    label: format(option.source === "PROMOTION" ? text.benefitPromotion : text.benefitCoupon, { label: option.label, benefit: offerBenefitWords(option.benefit, locale, messages.storefront.offers) }),
  }))
  const gone = chosen !== POPUP_BENEFIT_AUTO && !named.some((choice) => choice.value === chosen)

  return [{ value: POPUP_BENEFIT_AUTO, label: text.benefitAuto }, ...named, ...(gone ? [{ value: chosen, label: text.benefitGone }] : [])]
}

/**
 * What the form as typed would announce now — before it is saved. Following the shop, the shop's
 * headline; naming one, that one while it is in force and nothing while it is not. Every number is
 * one the API sent with the overview.
 */
export function previewBenefitOf(overview: Pick<StorePopupOverview, "headline" | "options">, chosen: string): FirstPurchaseHeadline | null {
  if (chosen === POPUP_BENEFIT_AUTO) return overview.headline
  return overview.options.find((option) => choiceOf(option.source, option.id) === chosen)?.benefit ?? null
}

const copyOf = (value: PopupFormValues): PopupCopyValue => ({ title: sentenceOf(value.title), text: sentenceOf(value.text), buttonLabel: sentenceOf(value.buttonLabel) })

/** The words a visitor would read of the form as typed: `popupWordsOf`, the function the shop window draws from. */
export function previewWordsOf(value: PopupFormValues, benefit: FirstPurchaseHeadline | null, locale: string, messages: UiMessages): PopupWords {
  return popupWordsOf(copyOf(value), benefit, locale, messages)
}

/** What a visitor reads where every sentence is left blank: the form's placeholders. */
export function popupDefaultsOf(benefit: FirstPurchaseHeadline | null, locale: string, messages: UiMessages): Pick<PopupWords, "title" | "text" | "buttonLabel"> {
  const { title, text, buttonLabel } = popupWordsOf({ title: null, text: null, buttonLabel: null }, benefit, locale, messages)
  return { title, text, buttonLabel }
}

/**
 * What the form as typed is announcing, in a sentence. With no benefit it says so plainly — and,
 * when a sentence written by hand is shown with nothing behind it, asks the shopkeeper to read it
 * again: words are not policed, only numbers are.
 */
export function popupAnnouncingOf(value: PopupFormValues, benefit: FirstPurchaseHeadline | null, locale: string, messages: UiMessages): PopupAnnouncing {
  const text = messages.discounts.popup
  if (benefit) return { tone: "benefit", sentence: format(text.announcing, { benefit: offerBenefitWords(benefit, locale, messages.storefront.offers) }) }

  const shownAsTyped = Object.values(copyOf(value)).some((sentence) => sentence !== null && !sentence.includes(POPUP_BENEFIT_PLACEHOLDER))
  return { tone: "nothing", sentence: value.benefit === POPUP_BENEFIT_AUTO ? text.announcingNothing : text.announcingGone, note: shownAsTyped ? text.announcingTyped : null }
}

/** The API's refusal, in words; a code this screen does not know is the general sentence. */
export function popupErrorOf(errorCode: string, text: Text["errors"]): string {
  return errorCode in text ? text[errorCode as keyof Text["errors"]] : text.UNKNOWN
}
