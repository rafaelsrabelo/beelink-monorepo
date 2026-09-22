// Types
import type { Banner } from "@harness-monorepo/contracts"
import type { ArrangementLayout } from "@harness-monorepo/ui/blocks/design/banner-arrangement"
import { PRODUCTS_ROW_ID } from "@harness-monorepo/ui/blocks/design/banner-arrangement"

/**
 * One banner as the editor holds it while it is being arranged.
 *
 * A shape of its own and not the wire `Banner`, because these are the only five fields the
 * arrangement can change. A draft carrying the whole banner would invite a screen to edit a title
 * here, which is the banner form's job, and would make "what actually moved" impossible to answer
 * without comparing twelve fields.
 */
export interface Draft {
  id: string
  title: string
  imageUrl: string
  layout: ArrangementLayout
  isActive: boolean
  belowProducts: boolean
}

export function toDraft(banner: Banner): Draft {
  return {
    id: banner.id,
    title: banner.title,
    imageUrl: banner.imageUrl,
    layout: banner.layout,
    isActive: banner.isActive,
    belowProducts: banner.belowProducts,
  }
}

/** The ids the landing page draws, in order, with the products' own row among them. */
export function orderedIdsOf(rows: readonly Draft[]): string[] {
  return [
    ...rows.filter((row) => !row.belowProducts).map((row) => row.id),
    PRODUCTS_ROW_ID,
    ...rows.filter((row) => row.belowProducts).map((row) => row.id),
  ]
}

/**
 * Where each poster landed, read off one list.
 *
 * The products' id is in it, and its place is the answer: everything before it is above the bands,
 * everything after is under them. Removing it shifts each later poster down by one, which is
 * exactly the count of the ones that stayed above — so `position >= at` is the side.
 *
 * A pure function and not a handler, so the rule can be tested without a browser: this is the one
 * piece of the editor where an off-by-one silently sends every poster to the wrong half.
 */
export function applyOrder(rows: readonly Draft[], ids: readonly string[]): Draft[] {
  const at = ids.indexOf(PRODUCTS_ROW_ID)
  // Without the row there is no answer to give, and guessing a side would move every poster.
  if (at < 0) return [...rows]

  return ids
    .filter((id) => id !== PRODUCTS_ROW_ID)
    .map((id, position) => {
      const row = rows.find((candidate) => candidate.id === id)
      return row ? { ...row, belowProducts: position >= at } : null
    })
    .filter((row) => !!row)
}

/**
 * What has to be written, comparing the draft against what the server holds.
 *
 * One patch per banner whose size, visibility or side moved, and none for the ones that did not —
 * a write per row would touch `updatedAt` on posters nobody edited. The order goes as the whole
 * list or not at all, because the API refuses a partial one: the rows it omits keep positions that
 * now collide.
 */
export function changesOf(rows: readonly Draft[], saved: readonly Banner[]) {
  const byId = new Map(saved.map((banner) => [banner.id, banner]))
  const ids = rows.map((row) => row.id)

  return {
    ids,
    orderChanged: saved.some((banner, at) => banner.id !== ids[at]),
    changed: rows.filter((row) => {
      const was = byId.get(row.id)

      return (
        !!was &&
        (was.layout !== row.layout ||
          was.isActive !== row.isActive ||
          was.belowProducts !== row.belowProducts)
      )
    }),
  }
}
