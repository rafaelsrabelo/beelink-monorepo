// UI
import { SECTION_CATEGORIES, SECTION_TYPES, type SectionCategory } from "@harness-monorepo/ui/lib/section-registry"

// Locales
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { COMPONENT_KINDS, type Across, type ComponentKind } from "./design-types"

/** One card of the gallery: a kind, and how many of it share the row it makes. */
export interface GalleryEntry {
  kind: ComponentKind
  across: Across
  name: string
  hint: string
}

/** A shelf of the gallery: Recomendadas, or one of the registry's categories. */
export type GalleryShelf = "RECOMMENDED" | SectionCategory

/** The rows a banner is offered in besides the whole one, in the order the owner asked for them. */
const ROWS = [2, 3] as const satisfies readonly Across[]

/** What the gallery offers here, one card per kind — and per row, where the kind makes rows and a band is being created. */
export function entriesOf(
  offered: readonly ComponentKind[],
  offerRows: boolean,
  messages: UiMessages,
): GalleryEntry[] {
  const text = messages.design
  return COMPONENT_KINDS.filter((kind) => offered.includes(kind)).flatMap((kind) => {
    const one: GalleryEntry = { kind, across: 1, name: text.kinds[kind], hint: text.gallery.hints[kind] }
    if (!offerRows || !SECTION_TYPES[kind].rows) return [one]
    return [
      one,
      ...ROWS.map((across) => ({
        kind,
        across,
        name: format(text.gallery.bannersAcross, { count: String(across) }),
        hint: text.gallery.bannersAcrossHints[across],
      })),
    ]
  })
}

/** The shelves with anything on them, Recomendadas first, each with its cards. An empty shelf is not drawn. */
export function shelvesOf(entries: readonly GalleryEntry[]): { shelf: GalleryShelf; entries: GalleryEntry[] }[] {
  const recommended = entries.filter((entry) => SECTION_TYPES[entry.kind].recommended)
  return [
    { shelf: "RECOMMENDED" as const, entries: recommended },
    ...SECTION_CATEGORIES.map((category) => ({
      shelf: category,
      entries: entries.filter((entry) => SECTION_TYPES[entry.kind].category === category),
    })),
  ].filter((shelf) => shelf.entries.length > 0)
}

/**
 * The cards a search finds, in name and line both: the shopkeeper who searches "carrossel" is
 * looking for the banner, and the word is only in its line. Not accent-folded: the copy is pt-BR,
 * and folding it would need the locale's collator for one field of one dialog.
 */
export function matchesOf(entries: readonly GalleryEntry[], query: string): GalleryEntry[] {
  const needle = query.trim().toLocaleLowerCase()
  return needle === "" ? [...entries] : entries.filter((entry) => `${entry.name} ${entry.hint}`.toLocaleLowerCase().includes(needle))
}
