/*
  "4 sabores": how many values a product's first option has, in the words a card says it with. The
  option's name is the shopkeeper's own, so its plural is made here, by the language's rules, rather
  than asked of them for every option they create.
*/

/** One noun in the plural, by pt-BR's regular rules: "Sabor" → "sabores", "Opção" → "opções", "Tamanho" → "tamanhos". */
function pluralPt(word: string): string {
  if (/ão$/i.test(word)) return word.replace(/ão$/i, "ões")
  if (/[rz]$/i.test(word)) return `${word}es`
  if (/al$/i.test(word)) return word.replace(/al$/i, "ais")
  if (/el$/i.test(word)) return word.replace(/el$/i, "éis")
  if (/ol$/i.test(word)) return word.replace(/ol$/i, "óis")
  if (/ul$/i.test(word)) return word.replace(/ul$/i, "uis")
  if (/il$/i.test(word)) return word.replace(/il$/i, "is")
  if (/m$/i.test(word)) return word.replace(/m$/i, "ns")
  if (/[sx]$/i.test(word)) return word
  return `${word}s`
}

/** One noun in the plural, in English: "Flavor" → "flavors", "Capacity" → "capacities". */
function pluralEn(word: string): string {
  if (/[^aeiou]y$/i.test(word)) return word.replace(/y$/i, "ies")
  if (/(s|x|z|ch|sh)$/i.test(word)) return `${word}es`
  return `${word}s`
}

/** A word written Capitalized is lowered inside a sentence; one that is not — "GB", "iPhone" — is kept. */
function inSentence(word: string): string {
  return /^\p{Lu}\p{Ll}*$/u.test(word) ? word.toLocaleLowerCase() : word
}

/**
 * "4 sabores", "3 tamanhos do copo": the count and the option's name, its first word in the plural.
 * Null for an option with one value or none: that is not a choice the visitor has to make.
 */
export function optionCountOf(summary: { name: string; valueCount: number } | null | undefined, locale: string): string | null {
  if (!summary || summary.valueCount < 2 || !summary.name.trim()) return null

  const [first = "", ...rest] = summary.name.trim().split(/\s+/)
  const plural = locale.toLowerCase().startsWith("pt") ? pluralPt(first) : pluralEn(first)
  return [String(summary.valueCount), inSentence(plural), ...rest].join(" ")
}
