/**
 * Reais as a person types them, and cents as the database keeps them.
 *
 * It is a file of its own because the crossing is where this product has been burned before: the
 * legacy kept reais, cents and "R$ 25,00" in one column and chose between them with
 * `if (price < 1000)`, which is how a product could be sold for a hundredth of its price. There is
 * one representation on the wire — whole cents — and exactly one place that converts.
 */

/**
 * "139,90", "139.90", "R$ 139,90" and "13990" are four ways of typing the same field. Everything
 * that is not a digit, a comma or a dot is dropped; the last separator is the decimal one, so a
 * thousands dot does not turn a hundred and thirty-nine reais into thirteen thousand.
 *
 * Answers null for anything that is not a number, which the screen reports rather than guessing at.
 */
export function centsFrom(typed: string): number | null {
  const cleaned = typed.trim().replace(/[^\d.,]/g, "")

  if (cleaned === "") return null

  const lastComma = cleaned.lastIndexOf(",")
  const lastDot = cleaned.lastIndexOf(".")
  const separator = Math.max(lastComma, lastDot)

  // No separator at all is a whole number of reais. "1390" is one thousand three hundred and
  // ninety reais, not thirteen and ninety — a field labelled in reais takes reais.
  const whole = separator === -1 ? cleaned : cleaned.slice(0, separator)
  const fraction = separator === -1 ? "" : cleaned.slice(separator + 1)

  const reais = Number.parseInt(whole.replace(/[.,]/g, ""), 10)

  if (!Number.isFinite(reais)) return null

  // More than two decimals is a typo, not a third of a cent: "10,999" is ten reais and ninety-nine.
  const cents = Number.parseInt(fraction.padEnd(2, "0").slice(0, 2), 10)

  return reais * 100 + (Number.isFinite(cents) ? cents : 0)
}

/**
 * The same crossing for a field where a guess is paid for by somebody: a discount, a minimum order.
 * `centsFrom` reads "1.000" as one real, because its last separator is the decimal one — fine for a
 * price a shopkeeper sees printed back at once, costly for a minimum that then lets every order in.
 *
 * So this one takes only what has one reading: reais with an optional comma or dot and up to two
 * decimals ("139,90", "139.9"), or the Brazilian thousands form ("1.000", "1.234,56"), with or
 * without "R$". A sign, three decimals, a letter: null, and the screen asks again.
 */
export function centsFromStrict(typed: string): number | null {
  const cleaned = typed.trim().replace(/^R\$\s*/i, "")
  const grouped = /^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(cleaned)
  if (!grouped && !/^\d+([.,]\d{1,2})?$/.test(cleaned)) return null

  const [whole = "", fraction = ""] = (grouped ? cleaned.replace(/\./g, "") : cleaned).split(/[.,]/)
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"))
  return Number.isSafeInteger(cents) ? cents : null
}

/** Cents back into what the field shows. Always two decimals, so an empty cents place is not lost. */
export function reaisFrom(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return ""

  return (cents / 100).toFixed(2).replace(".", ",")
}
