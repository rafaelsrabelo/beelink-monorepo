/**
 * Which of a product's photos one combination shows — pure, so the shop window's gallery and the
 * editor's table of combinations agree, and it can be tested without a browser.
 *
 * A photo names the option values it is of: the Morango tub, or the 900 g Morango tub. A combination
 * shows it when, for every option the photo names, the combination's value is one the photo names:
 * values of one option widen (Chocolate or Baunilha), different options narrow (Morango and 900 g),
 * as the listing's filters do. A photo naming nothing is of every combination.
 *
 * Ids or keys alike: the shop window passes value ids, the editor its draft's value keys.
 */

export interface TaggedPhoto {
  /** Absent or empty: a photo of every combination. */
  optionValueIds?: readonly string[]
}

/** Value → the option it is a value of. */
export type OptionOfValue = ReadonlyMap<string, string>

/** The map a set of options draws, from whatever each calls its id. */
export function optionOfValue<Option, Value>(
  options: readonly Option[],
  valuesOf: (option: Option) => readonly Value[],
  idOf: (entry: Option | Value) => string,
): OptionOfValue {
  return new Map(options.flatMap((option) => valuesOf(option).map((value) => [idOf(value), idOf(option)] as const)))
}

/**
 * How many options a photo narrows by, or -1 when the combination is not one it is of. A value the
 * product no longer has names nothing.
 */
function specificityOf(photo: TaggedPhoto, optionOf: OptionOfValue, chosen: ReadonlySet<string>): number {
  const named = new Map<string, boolean>()
  for (const valueId of photo.optionValueIds ?? []) {
    const option = optionOf.get(valueId)
    if (option) named.set(option, (named.get(option) ?? false) || chosen.has(valueId))
  }
  return [...named.values()].every(Boolean) ? named.size : -1
}

/**
 * The photos of one combination: the ones naming the most options first, then the rest, each group
 * in the shopkeeper's order. When none is of it the whole gallery comes back, in its order —
 * another flavour's tub says more than "no photo".
 */
export function photosOf<Photo extends TaggedPhoto>(
  photos: readonly Photo[],
  optionOf: OptionOfValue,
  combination: readonly string[],
): Photo[] {
  const chosen = new Set(combination)
  const fitting = photos
    .map((photo, index) => ({ photo, index, specificity: specificityOf(photo, optionOf, chosen) }))
    .filter((entry) => entry.specificity >= 0)

  if (fitting.length === 0) return [...photos]
  return fitting.sort((a, b) => b.specificity - a.specificity || a.index - b.index).map((entry) => entry.photo)
}

/**
 * A value's own photo: the first one tagged with it — the flavour's tub for "Uva". Its card in the
 * picker shows it; a value with none shows its colour, or the plain placeholder.
 */
export function valuePhotoOf<Photo extends TaggedPhoto>(photos: readonly Photo[], valueId: string): Photo | undefined {
  return photos.find((photo) => photo.optionValueIds?.includes(valueId))
}
