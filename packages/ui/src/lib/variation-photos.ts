// Lib
import type { VariationsValue } from "@harness-monorepo/ui/lib/variations"

/**
 * What each photo of a product is of, as the variations draft keeps it: photo URL → value keys. See
 * `lib/photo-choice` for how a combination picks its photos.
 *
 * The marks are always stored in one form — photos in URL order, each one's keys sorted, no photo
 * without keys, and no map at all when nothing is marked — because the editor finds unsaved work by
 * comparing drafts as text. Unticking Morango and ticking it again must give back the same text.
 */
export type VariationPhotos = NonNullable<VariationsValue["photos"]>

/** The one form a set of marks is stored in; undefined when no photo is marked. */
export function canonicalPhotos(entries: Iterable<readonly [string, readonly string[]]>): VariationPhotos | undefined {
  const marked = [...entries]
    .filter(([, keys]) => keys.length > 0)
    .map(([url, keys]) => [url, [...new Set(keys)].sort()] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return marked.length > 0 ? Object.fromEntries(marked) : undefined
}

/** The value keys a photo is of; empty when it is of every combination. */
export function photoValuesOf(value: VariationsValue, url: string): readonly string[] {
  return value.photos?.[url] ?? []
}

/** Marks a photo as of these values, or of every combination when there are none. */
export function setPhotoValues(value: VariationsValue, url: string, valueKeys: readonly string[]): VariationsValue {
  const others = Object.entries(value.photos ?? {}).filter(([marked]) => marked !== url)
  return { ...value, photos: canonicalPhotos([...others, [url, valueKeys]]) }
}

/**
 * The marks without the values that are gone. A photo that was only of Morango becomes a photo of
 * every combination when Morango is removed — it is never dropped, and its button says so.
 */
export function photosWithout(photos: VariationsValue["photos"], removed: readonly string[]): VariationsValue["photos"] {
  return canonicalPhotos(Object.entries(photos ?? {}).map(([url, keys]) => [url, keys.filter((key) => !removed.includes(key))]))
}
