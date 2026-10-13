/**
 * The two masks of the landing's courier form (BEELINK-322): a CPF and a Brazilian mobile, written
 * as a person writes them while they type. Pure functions of what is in the field — typed a key at a
 * time or pasted whole — and never ending in punctuation, so a backspace always takes a digit.
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
 * A mobile's eleven digits out of what was typed: the area code and the nine of the number.
 *
 * The country's 55 is taken off a number that says it is there — written with its `+`, or thirteen
 * digits long, which only a country code makes of a mobile. It is never guessed from twelve: 55 is
 * also Santa Maria's area code, and a twelfth key pressed by mistake must not turn that number into
 * another. A trunk's 0 in front goes too, since no area code starts with one.
 */
function mobileDigitsOf(typed: string): string {
  const digits = digitsOf(typed)
  const national = /^\s*\+\s*55/.test(typed) || (digits.length === 13 && digits.startsWith("55")) ? digits.slice(2) : digits

  return national.replace(/^0+/, "").slice(0, 11)
}

/**
 * `(00) 00000-0000`: a mobile with its area code. Not the shop screen's `maskPhone` — that one keeps
 * a landline's shape and a country code's digits, and this field takes a Brazilian mobile only.
 */
export function maskMobile(typed: string): string {
  const digits = mobileDigitsOf(typed)
  if (digits.length <= 2) return digits ? `(${digits}` : ""

  const area = digits.slice(0, 2)
  const head = digits.slice(2, 7)
  const tail = digits.slice(7)

  return tail ? `(${area}) ${head}-${tail}` : `(${area}) ${head}`
}

/**
 * Writes a field's value through its mask and puts the caret back after as many digits as it stood
 * after: a digit corrected in the middle of a CPF stays where the person is typing, instead of the
 * caret jumping to the end as it does when a value is replaced. A mask never ends in punctuation, so
 * a caret that stood after every digit lands at the end.
 */
export function maskField(field: HTMLInputElement, mask: (typed: string) => string): void {
  const before = digitsOf(field.value.slice(0, field.selectionStart ?? field.value.length)).length
  const masked = mask(field.value)
  field.value = masked

  // A field filled in by the browser is not the one being typed in, and selecting inside it would take the focus there.
  if (field.ownerDocument.activeElement !== field) return

  let caret = 0
  for (let seen = 0; caret < masked.length && seen < before; caret += 1) {
    if (/\d/.test(masked[caret]!)) seen += 1
  }
  field.setSelectionRange(caret, caret)
}
