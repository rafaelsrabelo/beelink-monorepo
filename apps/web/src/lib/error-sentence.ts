// Types
import type { WebMessages } from "@/locales"

/**
 * The sentence for an error code, else the generic one. Own keys only: a code read from the address
 * bar, such as `constructor`, would otherwise reach `Object`'s own members through the dictionary,
 * and a function is no sentence — the page would throw drawing it.
 */
export function errorSentenceOf(errors: WebMessages["errors"], code: string): string {
  return Object.hasOwn(errors, code) ? errors[code as keyof WebMessages["errors"]] : errors.UNKNOWN
}
