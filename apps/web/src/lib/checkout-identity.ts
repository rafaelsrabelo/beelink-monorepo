// Types
import type { WebMessages } from "@/locales"
import type { SectionQuery } from "./storefront-section"

// App
import { errorSentenceOf } from "./error-sentence"
import { paramOf } from "./storefront-routes"

/** The cart's query: the e-mail typed at the checkout, back into a refused form. Never the name or the WhatsApp. */
export const CHECKOUT_EMAIL_KEY = "email"
/** The cart's query: why "who is buying" was refused, as its code. */
export const CHECKOUT_ERROR_KEY = "erro-dados"

/** Who is buying, as the cart's address left it: the e-mail of a refused form, and what to say. */
export interface CheckoutIdentityState {
  email: string | null
  error: string | null
}

/** An e-mail as far as an address can carry one: anything longer is no e-mail, and is dropped. */
const EMAIL_MAX = 254

/**
 * A visitor's "who is buying" from the cart's query (plan 2026-11-06--P0-checkout-sem-codigo). An address
 * is anyone's to write: the e-mail goes into a field, escaped, and the code into the copy's own lookup,
 * which knows its keys only.
 */
export function checkoutIdentityOf(query: SectionQuery, errors: WebMessages["errors"]): CheckoutIdentityState {
  const raw = paramOf(query[CHECKOUT_EMAIL_KEY])?.trim() ?? ""
  const code = paramOf(query[CHECKOUT_ERROR_KEY])
  return { email: raw && raw.length <= EMAIL_MAX ? raw : null, error: code ? errorSentenceOf(errors, code) : null }
}
