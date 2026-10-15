// Block
import { maskCpf } from "../landing/landing-courier-masks"
import { isCpf } from "../landing/landing-courier-schema"

const digitsOf = (typed: string) => typed.replace(/\D/g, "")

/**
 * Whether fourteen digits are a CNPJ: not one digit repeated, and both check digits right — each the
 * sum of the digits before it weighted 2 to 9 from the right, cycling, modulo eleven, under two
 * counting as zero and otherwise eleven minus it.
 *
 * The API's own rule (`shared/http/cnpj.ts`), restated: this package cannot import it. A CNPJ with
 * letters, issued since July 2026, the API refuses still — and so does this.
 */
export function isCnpj(typed: string): boolean {
  const digits = digitsOf(typed)
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false
  const check = (length: number) => {
    let sum = 0
    for (let index = 0; index < length; index += 1) sum += Number(digits[length - 1 - index]) * ((index % 8) + 2)
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }
  return check(12) === Number(digits[12]) && check(13) === Number(digits[13])
}

/** Who a page's plan is charged to (BEELINK-291): eleven digits that are a CPF, or fourteen that are a CNPJ, whatever is written around them. */
export function isCpfOrCnpj(typed: string): boolean {
  const digits = digitsOf(typed)
  if (digits.length === 11) return isCpf(digits)
  return digits.length === 14 && isCnpj(digits)
}

/**
 * `000.000.000-00` up to the eleventh digit, `00.000.000/0000-00` from the twelfth, and what is typed
 * past fourteen left out: a CNPJ is typed through the shape of a CPF until it is longer than one.
 * Never ending in punctuation, so a backspace always takes a digit.
 */
export function maskDocument(typed: string): string {
  const digits = digitsOf(typed).slice(0, 14)
  if (digits.length <= 11) return maskCpf(digits)

  const head = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 8)].join(".")
  const branch = digits.slice(8, 12)
  const check = digits.slice(12)

  return check ? `${head}/${branch}-${check}` : `${head}/${branch}`
}

/** The API's bounds for a name (`BILLING_NAME_MIN_LENGTH`, `BILLING_NAME_MAX_LENGTH`), restated. */
export const BILLING_NAME_MIN_LENGTH = 2
export const BILLING_NAME_MAX_LENGTH = 120

/**
 * A person's name or a company's, as the API keeps it — trimmed, a run of spaces read as one — within
 * its bounds counted as Postgres counts a `VARCHAR`: in code points, so an emoji is one character.
 */
export function isBillingName(typed: string): boolean {
  const length = [...typed.trim().replace(/\s+/g, " ")].length
  return length >= BILLING_NAME_MIN_LENGTH && length <= BILLING_NAME_MAX_LENGTH
}
