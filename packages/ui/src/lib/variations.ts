/**
 * The variations editor's draft, and the rules that keep its rows attached to their combinations
 * while the shopkeeper adds, renames, reorders and removes options — pure, so the screen and the
 * block agree on them and they can be tested without a browser.
 *
 * A combination is named by the set of its value keys, sorted, so reordering options or values never
 * moves a row. A value keeps its key when it is renamed, so a rename keeps the row too. What changes
 * a combination is adding or removing a value or an option, and each of those carries the rows
 * across the way the API does when it saves: see ReplaceProductOptionsPayload.
 */

/** A value of an option. `key` is the saved value's id, or `new:…` for one not saved yet. */
export interface VariationValue {
  key: string
  name: string
  /** `#rrggbb` on a colour option's values, null elsewhere. */
  colorHex: string | null
}

export interface VariationOption {
  key: string
  name: string
  /** Whether its values carry a swatch. Set by the "Cor" preset. */
  isColor: boolean
  values: VariationValue[]
}

/** What the shopkeeper types for one combination. Money is reais as typed, like the product's. */
export interface VariationRow {
  isActive: boolean
  price: string
  stock: string
  sku: string
  /**
   * Grams, as typed. A combination's own, because a 750 g and a 900 g tub of one whey are quoted
   * differently by a carrier; the box stays the product's, in its Envio section.
   */
  weight: string
}

export interface VariationsValue {
  options: VariationOption[]
  /** Keyed by `combinationKey`. A combination with no row yet borrows its nearest neighbour's price. */
  rows: Record<string, VariationRow>
}

export interface VariationCombination {
  key: string
  /** One value per option that has values, in the options' order. */
  values: VariationValue[]
  row: VariationRow
}

/** Mirrors the API's limits, so the editor refuses before the save does. */
export const VARIATION_OPTIONS_MAX = 3
export const VARIATION_COMBINATIONS_MAX = 100

export const EMPTY_VARIATIONS: VariationsValue = { options: [], rows: {} }

export function combinationKey(valueKeys: readonly string[]): string {
  return [...valueKeys].sort().join("|")
}

function keysOf(key: string): string[] {
  return key === "" ? [] : key.split("|")
}

/** Only options with at least one value make combinations; an empty one is still being written. */
function filled(options: readonly VariationOption[]): VariationOption[] {
  return options.filter((option) => option.values.length > 0)
}

export function combinationCountOf(options: readonly VariationOption[]): number {
  const withValues = filled(options)
  return withValues.length === 0 ? 0 : withValues.reduce((count, option) => count * option.values.length, 1)
}

/** `#rrggbb` from its three channels. A swatch is data, and this is how the editor writes one. */
export function swatchOf(red: number, green: number, blue: number): string {
  return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`
}

/**
 * Where a new value of a colour option starts: a neutral grey, which reads as "not picked yet" in
 * the editor. The colour field cannot hold "no colour", and starting one on black would make black
 * the one colour a shopkeeper could not pick — the field fires no change for the value it shows.
 */
export const FIRST_SWATCH = swatchOf(128, 128, 128)

/** A new key for a value or an option the server has not seen. */
export function newKey(): string {
  return `new:${crypto.randomUUID()}`
}

export function isNewKey(key: string): boolean {
  return key.startsWith("new:")
}

/**
 * The row a combination nobody typed yet starts from: the price and weight of the row that shares
 * the most values with it — a starting point to correct, not a guess to trust — and neither its stock
 * nor its code, which describe another physical thing.
 */
function borrowedRow(valueKeys: readonly string[], rows: Record<string, VariationRow>, base: VariationRow): VariationRow {
  let best: VariationRow | undefined
  let bestShared = -1

  for (const [key, row] of Object.entries(rows)) {
    const shared = keysOf(key).filter((valueKey) => valueKeys.includes(valueKey)).length
    if (shared > bestShared) {
      best = row
      bestShared = shared
    }
  }

  return { isActive: true, price: (best ?? base).price, stock: "", sku: "", weight: (best ?? base).weight }
}

/** Every combination, the first option slowest, each with its row. */
export function combinationsOf(value: VariationsValue, base: VariationRow): VariationCombination[] {
  const withValues = filled(value.options)
  if (withValues.length === 0) return []

  const crossed = withValues.reduce<VariationValue[][]>(
    (combinations, option) => combinations.flatMap((prefix) => option.values.map((entry) => [...prefix, entry])),
    [[]],
  )

  return crossed.map((values) => {
    const key = combinationKey(values.map((entry) => entry.key))
    return { key, values, row: value.rows[key] ?? borrowedRow(keysOf(key), value.rows, base) }
  })
}

/** "P · Areia". */
export function labelOf(values: readonly VariationValue[]): string {
  return values.map((entry) => entry.name).join(" · ")
}

/**
 * Adds a value. An option's first value extends every row, the way the API extends every variant
 * with a new option's first value — so "P" keeps its price when "Cor" gets "Areia".
 */
export function addValue(value: VariationsValue, optionKey: string, entry: VariationValue, base: VariationRow): VariationsValue {
  const option = value.options.find((candidate) => candidate.key === optionKey)
  if (!option) return value

  const extending = option.values.length === 0
  const sources = Object.keys(value.rows).length > 0 || !extending ? value.rows : { "": base }
  const next: VariationsValue = {
    options: value.options.map((candidate) =>
      candidate.key === optionKey ? { ...candidate, values: [...candidate.values, entry] } : candidate,
    ),
    rows: extending
      ? Object.fromEntries(
          Object.entries(sources).map(([key, row]) => [combinationKey([...keysOf(key), entry.key]), row]),
        )
      : value.rows,
  }

  // The combinations the value opens get their own rows now, from their neighbours as they are:
  // a row that kept borrowing would change price every time its neighbour did.
  return written(next, base)
}

/** The same draft with a row of its own for every combination it shows. */
function written(value: VariationsValue, base: VariationRow): VariationsValue {
  return { ...value, rows: Object.fromEntries(combinationsOf(value, base).map((combination) => [combination.key, combination.row])) }
}

/** Removes a value, and with it every row that named it. */
export function removeValue(value: VariationsValue, optionKey: string, valueKey: string): VariationsValue {
  const option = value.options.find((candidate) => candidate.key === optionKey)
  if (!option) return value

  const last = option.values.length === 1
  return {
    options: value.options.map((candidate) =>
      candidate.key === optionKey
        ? { ...candidate, values: candidate.values.filter((entry) => entry.key !== valueKey) }
        : candidate,
    ),
    // The last value of an option takes the option out of every combination rather than every row.
    rows: last
      ? collapse(value.rows, [valueKey])
      : Object.fromEntries(Object.entries(value.rows).filter(([key]) => !keysOf(key).includes(valueKey))),
  }
}

/**
 * Removes an option. Combinations that differed only there become one, and the first in the
 * shopkeeper's order is the one that carries on — as the API archives the rest.
 */
export function removeOption(value: VariationsValue, optionKey: string, base: VariationRow): VariationsValue {
  const option = value.options.find((candidate) => candidate.key === optionKey)
  if (!option) return value

  const ordered = combinationsOf(value, base)
  const rows = Object.fromEntries(ordered.map((combination) => [combination.key, combination.row]))

  return {
    options: value.options.filter((candidate) => candidate.key !== optionKey),
    rows: collapse(rows, option.values.map((entry) => entry.key)),
  }
}

/**
 * Rows whose combinations merge keep the first one on sale, and the first of all when none is — the
 * choice the API makes, so the row shown is the variant that survives. A merge down to no option at
 * all leaves no row: the product sells one thing again, priced in its own sections.
 */
function collapse(rows: Record<string, VariationRow>, dropped: readonly string[]): Record<string, VariationRow> {
  const next: Record<string, VariationRow> = {}
  for (const [key, row] of Object.entries(rows)) {
    const kept = combinationKey(keysOf(key).filter((valueKey) => !dropped.includes(valueKey)))
    if (kept === "") continue
    const claimant = next[kept]
    if (!claimant || (!claimant.isActive && row.isActive)) next[kept] = row
  }
  return next
}

/**
 * Sets part of several rows at once — one edited in place, or the bulk "same price" and "set
 * stock". Every row shown is written first, so a patch reaches the rows chosen and no other.
 */
export function patchRows(
  value: VariationsValue,
  combinations: readonly VariationCombination[],
  patch: Partial<VariationRow>,
  base: VariationRow,
): VariationsValue {
  const rows = { ...written(value, base).rows }
  for (const combination of combinations) rows[combination.key] = { ...combination.row, ...patch }
  return { ...value, rows }
}
