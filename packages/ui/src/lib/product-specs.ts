/** One row of "Informações técnicas": what is measured, and what it is. */
export interface SpecRow {
  label: string
  value: string
}

interface SpecOption {
  name: string
  values: readonly { name: string }[]
}

/**
 * "Informações técnicas" from what a product already knows: its category, then each option with
 * every value it comes in — "Sabor: Frutas vermelhas, Limão, Uva". Brand, serving and the rest wait
 * for fields of their own (D4); a code is never public (BEELINK-21). No rows, no table.
 */
export function specRowsOf(options: readonly SpecOption[], category: { name: string } | null | undefined, categoryLabel: string): SpecRow[] {
  const rows = options.filter((option) => option.values.length > 0).map((option) => ({ label: option.name, value: option.values.map((value) => value.name).join(", ") }))
  return category ? [{ label: categoryLabel, value: category.name }, ...rows] : rows
}
