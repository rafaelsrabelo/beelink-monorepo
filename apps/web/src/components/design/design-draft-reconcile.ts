// Types
import type { Section } from "@harness-monorepo/contracts"

// App
import { toComponentDraft, toDraft, type SectionDraft } from "./design-draft"

/*
  How the draft follows the server without losing the arrangement. Apart from the draft's shapes
  because that module had reached the line limit, and the seam falls here: this is the one place a
  server answer is merged into an edit, where the rest reads or diffs one.
*/

/**
 * The draft brought back in step with the server, without throwing away the arrangement.
 *
 * The draft used to be seeded only while it was clean, so a row created or deleted after the owner
 * had moved anything never reached it. Publish then sent the list it had — and the reorder
 * endpoint answers 409 to a partial one, because the rows it omits keep positions that now
 * collide. That is exactly how it was reported: nine ids for a shop with fourteen blocks.
 *
 * Reconciled rather than replaced, because replacing would discard an unpublished arrangement the
 * owner is in the middle of. What they arranged is an order, and an order survives a row arriving
 * or leaving: the rows they still have keep their places, the ones the server no longer has go,
 * and a new one lands right after the row it follows on the server — which is where the "+" that
 * created it was, since the screen asks the API for that place.
 */
export function reconcile(draft: readonly SectionDraft[], saved: readonly Section[]): SectionDraft[] {
  const bySaved = new Map(saved.map((section) => [section.id, section]))

  const kept = draft
    .filter((row) => bySaved.has(row.id))
    .map((row) => {
      const was = bySaved.get(row.id)!
      const known = new Set(was.components.map((component) => component.id))

      return {
        ...row,
        components: withNewcomers(
          row.components.filter((component) => known.has(component.id)),
          was.components,
          toComponentDraft,
        ),
      }
    })

  return withNewcomers(kept, saved, toDraft)
}

/**
 * The rows the server has and the draft lacks, each placed right after the row that precedes it on
 * the server — or first, when nothing does. Walked in the server's order, so a newcomer's
 * predecessor is always already in the list, held or placed.
 */
function withNewcomers<Held extends { id: string }, Saved extends { id: string }>(
  held: readonly Held[],
  saved: readonly Saved[],
  toHeld: (row: Saved) => Held,
): Held[] {
  const result = [...held]
  const present = new Set(held.map((row) => row.id))

  saved.forEach((row, at) => {
    if (present.has(row.id)) return
    const before = saved[at - 1]
    result.splice(before ? result.findIndex((placed) => placed.id === before.id) + 1 : 0, 0, toHeld(row))
    present.add(row.id)
  })

  return result
}
