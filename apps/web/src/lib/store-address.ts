// Types
import type { StoreSlugAvailability, StoreSlugChangeTooSoonDetails, StoreSlugUnavailableReason } from "@harness-monorepo/contracts"
import type { StoreAddressAvailability, StoreAddressReasonValue } from "@harness-monorepo/ui/lib/store-address"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import type { WebMessages } from "@/locales"

// UI
import { format } from "@harness-monorepo/ui/locales/index"

// App
import { StoreRequestError } from "@/services/stores/store-requests"
import { dayInWords } from "./subscription-dates"

/*
  The screen that changes a page's address (BEELINK-331), and what it says.
*/

/** Where the page lands after a change: the same screen, at the new address, saying it is done. */
export const CHANGED_KEY = "trocado"

/** The screen in the panel. Every link to it is built here. */
export function storeAddressPageOf(slug: string): string {
  return `/admin/${encodeURIComponent(slug)}/store/address`
}

/** What every page's address starts with, as a person reads it: `beelink.biz/`. Only ever shown. */
export function platformPrefixOf(origin: string): string {
  return `${new URL(origin).host}/`
}

/** The API's reasons are ones the block can say: a reason the block lacks is a compile error here. */
const reasonOf = (reason: StoreSlugUnavailableReason): StoreAddressReasonValue => reason

/**
 * What the block says of the address being typed: nothing while nothing is; asked while the pause
 * the screen waits for has not come or the answer has not; then the answer. A check that failed says
 * nothing, and the button waits — the change itself would ask again anyway.
 */
export function availabilityOf(preview: string, asked: string, answer: { data?: StoreSlugAvailability; isFetching: boolean; isError: boolean }): StoreAddressAvailability {
  if (preview === "") return { state: "idle" }
  if (asked !== preview || answer.isFetching) return { state: "checking" }
  if (answer.isError || !answer.data || answer.data.slug !== preview) return { state: "idle" }
  return answer.data.available || answer.data.reason === null ? { state: "available" } : { state: "unavailable", reason: reasonOf(answer.data.reason) }
}

/** Why a change was refused, in the reader's words; the day another is accepted, where that is why. */
export function addressChangeErrorOf(error: unknown, text: UiMessages["store"]["addressChange"], errors: WebMessages["errors"], locale: string): string {
  if (!(error instanceof StoreRequestError)) return text.saveFailed

  switch (error.errorCode) {
    case "STORE_SLUG_TAKEN":
      return text.reasons.TAKEN
    case "STORE_SLUG_RESERVED":
      return text.reasons.RESERVED
    case "STORE_SLUG_INVALID":
      return text.reasons.INVALID
    case "STORE_SLUG_UNCHANGED":
      return text.reasons.UNCHANGED
    case "STORE_SLUG_CHANGE_TOO_SOON": {
      const day = (error.details as Partial<StoreSlugChangeTooSoonDetails> | undefined)?.changeableOn
      return typeof day === "string" ? format(text.tooSoon, { date: dayInWords(day, locale) }) : errors.STORE_SLUG_CHANGE_TOO_SOON
    }
    default:
      return errors[error.errorCode as keyof WebMessages["errors"]] ?? text.saveFailed
  }
}
