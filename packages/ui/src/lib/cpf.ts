/*
  A CPF as a person types it and as the API takes it: `000.000.000-00`, and whether its digits are
  one. The landing's courier form, a page's billing account and the checkout's CPF all read it here.
*/

const digitsOf = (typed: string) => typed.replace(/\D/g, "")

/** `000.000.000-00`: eleven digits, and what is typed past them is left out. */
export function maskCpf(typed: string): string {
  const digits = digitsOf(typed).slice(0, 11)
  const groups = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9)].filter(Boolean).join(".")
  const check = digits.slice(9)

  return check ? `${groups}-${check}` : groups
}

/**
 * Whether what was typed is a CPF, whichever points and dash are around its digits: eleven of them,
 * not one digit repeated — `111.111.111-11` passes the arithmetic and belongs to nobody — and both
 * check digits right, each the sum of the digits before it weighted from 10 (then 11) down to 2,
 * times ten, modulo eleven, a ten counting as zero.
 *
 * The API's own rule (`shared/http/cpf.ts`), restated: this package cannot import it. It spares a
 * person a round trip for a mistyped digit; the API still has the last word.
 */
export function isCpf(typed: string): boolean {
  const digits = digitsOf(typed)
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false
  const check = (length: number) => {
    let sum = 0
    for (let index = 0; index < length; index += 1) sum += Number(digits[index]) * (length + 1 - index)
    return ((sum * 10) % 11) % 10
  }
  return check(9) === Number(digits[9]) && check(10) === Number(digits[10])
}
