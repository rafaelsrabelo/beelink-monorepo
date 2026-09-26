// Libs
import type { Announcements } from "@dnd-kit/core"

// Locales
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/**
 * What a band is called everywhere design mode names it: its own name where it has one — a named
 * band is one the owner will look for by that name, in the menu and in the panel — and its place
 * otherwise. The structure, the panel's title, the preview's handle and the delete dialog all ask
 * here, because one of them once said "Faixa 2" over a band another called "HERO SECTION".
 *
 * A `.tsx` although it draws nothing: the package's export map reaches `./blocks/*` as `.tsx` only.
 */
export function bandLabelOf(name: string | null | undefined, position: number, messages: UiMessages): string {
  return name?.trim() || format(messages.design.bandNumber, { position: String(position) })
}

/**
 * What a screen reader is told while a band is dragged, in the shop's own words: the band by what
 * it is called, and the place it lands by its number — "na posição 3", never "na posição Serviços".
 *
 * dnd-kit ships English defaults that name an item by its id. The panel's board and the preview's
 * both drag bands, so both ask here, and a shopkeeper at the keyboard hears the same thing from each.
 */
export function bandAnnouncements(
  bands: readonly { id: string; name?: string | null }[],
  messages: UiMessages,
): Announcements {
  const text = messages.design
  const positionOf = (id: string | number) => bands.findIndex((band) => band.id === id) + 1
  const nameOf = (id: string | number) => {
    const at = positionOf(id)
    return at === 0 ? "" : bandLabelOf(bands[at - 1]!.name, at, messages)
  }

  return {
    onDragStart: ({ active }) => format(text.dragStart, { name: nameOf(active.id) }),
    onDragOver: ({ active, over }) =>
      over ? format(text.dragOver, { name: nameOf(active.id), position: String(positionOf(over.id)) }) : "",
    onDragEnd: ({ active, over }) =>
      over ? format(text.dragEnd, { name: nameOf(active.id), position: String(positionOf(over.id)) }) : "",
    onDragCancel: ({ active }) => format(text.dragCancel, { name: nameOf(active.id) }),
  }
}
