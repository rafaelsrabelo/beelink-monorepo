// Types
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import type { WebMessages } from "@/locales"

// App
import { errorSentenceOf } from "./error-sentence"

/** A refused deletion, as its code; apart from `erro`, which is the details form's. */
export const PRIVACY_ERROR_KEY = "erro-privacidade"
/** A copy that could not be made, as its code: said under its link, never in the deletion's form. */
export const DATA_ERROR_KEY = "erro-dados"

/** The privacy section's own handlers (BEELINK-152), under the shop's path where the shopper's cookies reach. */
export function privacyActionsOf(slug: string): { data: string; delete: string } {
  return { data: `/${slug}/api/customer/meus-dados`, delete: `/${slug}/api/customer/excluir-conta` }
}

/**
 * A refusal in the section's words. A wrong password here is not the "current password" of a
 * change: it says the account is still there.
 */
/** Why the copy did not come: too many asked for, in the shop's words; anything else, try again. */
export function downloadErrorOf(code: string, errors: WebMessages["errors"], messages: UiMessages): string {
  return code === "RATE_LIMITED" ? errorSentenceOf(errors, code) : messages.storefront.privacyDownloadFailed
}

export function privacyErrorOf(code: string, errors: WebMessages["errors"], messages: UiMessages): string {
  return code === "AUTH_PASSWORD_WRONG" ? messages.storefront.privacyPasswordWrong : errorSentenceOf(errors, code)
}
