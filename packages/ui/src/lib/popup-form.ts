/**
 * The first-purchase pop-up's form in the panel (BEELINK-306), as its fields hold it: strings, as
 * typed. The screen reads them into the wire's shape and refuses what does not hold, field by field.
 */

export type PopupTriggerValue = "ON_ARRIVAL" | "ON_LEAVE"

/** The benefit select's value for following the shop's headline; a named one is `PROMOTION:<id>` or `COUPON:<id>`. */
export const POPUP_BENEFIT_AUTO = "AUTO"

export interface PopupFormValues {
  enabled: boolean
  /** `""` is no picture. */
  imageUrl: string
  /** `""` is the default sentence. */
  title: string
  text: string
  buttonLabel: string
  trigger: PopupTriggerValue
  /** Seconds, as typed. */
  delay: string
  benefit: string
  /** Whether the offer strip stays under the header once the pop-up was closed (BEELINK-310). */
  keepReminder: boolean
}

export type PopupFormIssues = Partial<Record<"title" | "text" | "buttonLabel" | "delay", string>>

/** One thing the pop-up may announce, worded by the screen. */
export interface PopupBenefitChoice {
  value: string
  label: string
}

/** What the pop-up as typed announces, said over the preview: a benefit, or — plainly — nothing. */
export interface PopupAnnouncing {
  tone: "benefit" | "nothing"
  sentence: string
  /** A second sentence, when a hand-written text is shown with no benefit behind it. */
  note?: string | null
}
