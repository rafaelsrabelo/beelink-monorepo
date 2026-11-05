// Types
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import type { WebMessages } from "@/locales"
import type { SectionQuery } from "./storefront-section"

// App
import { errorSentenceOf } from "./error-sentence"
import { paramOf } from "./storefront-routes"

/** The cart's query: the checkout asking the code e-mailed to an account (`1`). */
export const CODE_STEP_KEY = "codigo"
/** The cart's query: the e-mail typed at the checkout — for the code step, and back into a refused form. Never the name or the WhatsApp. */
export const CHECKOUT_EMAIL_KEY = "email"
/** The cart's query: why "who is buying" was refused, as its code. */
export const CHECKOUT_ERROR_KEY = "erro-dados"
/** The cart's query: a new code went out (`1`). */
export const CODE_RESENT_KEY = "reenviado"

/** Who is buying, as the cart's address left it: which step, the e-mail, and what to say. */
export interface CheckoutIdentityState {
  step: "form" | "code"
  email: string | null
  error: string | null
  notice: string | null
}

/** An e-mail as far as an address can carry one: anything longer is no e-mail, and is dropped. */
const EMAIL_MAX = 254

/**
 * The checkout's "who is buying" from the cart's query (plan 2026-11-05--compra-sem-cadastro). The
 * code step needs the e-mail it went to: without one, it is the form. An address is anyone's to
 * write — the e-mail goes into a field and a sentence, both escaped, and the code into the copy's own
 * lookup, which knows its keys only.
 */
export function checkoutIdentityOf(query: SectionQuery, errors: WebMessages["errors"], messages: UiMessages): CheckoutIdentityState {
  const raw = paramOf(query[CHECKOUT_EMAIL_KEY])?.trim() ?? ""
  const email = raw && raw.length <= EMAIL_MAX ? raw : null
  const code = paramOf(query[CHECKOUT_ERROR_KEY])
  return {
    step: paramOf(query[CODE_STEP_KEY]) === "1" && email ? "code" : "form",
    email,
    error: code ? errorSentenceOf(errors, code) : null,
    notice: paramOf(query[CODE_RESENT_KEY]) === "1" ? messages.storefront.checkoutCodeResent : null,
  }
}
