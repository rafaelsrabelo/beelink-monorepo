// Types
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import type { WebMessages } from "@/locales"

// App
import { errorSentenceOf } from "./error-sentence"

/** A refused deletion, or a copy that could not be made, as its code; apart from `erro`, which is the details form's. */
export const PRIVACY_ERROR_KEY = "erro-privacidade"

/** The privacy section's own handlers (BEELINK-152), under the shop's path where the shopper's cookies reach. */
export function privacyActionsOf(slug: string): { data: string; delete: string } {
  return { data: `/${slug}/api/customer/meus-dados`, delete: `/${slug}/api/customer/excluir-conta` }
}

/**
 * A refusal in the section's words. A wrong password here is not the "current password" of a
 * change: it says the account is still there.
 */
export function privacyErrorOf(code: string, errors: WebMessages["errors"], messages: UiMessages): string {
  return code === "AUTH_PASSWORD_WRONG" ? messages.storefront.privacyPasswordWrong : errorSentenceOf(errors, code)
}
