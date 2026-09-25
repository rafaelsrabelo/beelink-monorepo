// App
import type { SectionDraft } from "./design-draft"

/** What the owner chose in the editor: a band, or a block. */
export type DesignSelection = { level: "band"; id: string } | { level: "block"; id: string }

/**
 * What a selection acts on. A block alone in its band acts as its band — as its card in the
 * structure already does: the handle moves the band, the eye hides the band, the bin deletes the
 * band — so the band carries the block it holds. A band of several blocks, chosen on its own,
 * carries none.
 */
export type SelectionTarget =
  | { level: "band"; id: string; blockId: string | null }
  | { level: "block"; id: string; sectionId: string }

/** Read against the draft, so a selection follows its block into the band it was moved to. */
export function targetOf(selection: DesignSelection | null, rows: readonly SectionDraft[]): SelectionTarget | null {
  if (!selection) return null

  const band =
    selection.level === "band"
      ? rows.find((row) => row.id === selection.id)
      : rows.find((row) => row.components.some((component) => component.id === selection.id))
  if (!band) return null

  const [only, second] = band.components
  if (only && !second) return { level: "band", id: band.id, blockId: only.id }

  return selection.level === "band"
    ? { level: "band", id: band.id, blockId: null }
    : { level: "block", id: selection.id, sectionId: band.id }
}

/** The band and the block a target's panel edits: its Estilo, and its Conteúdo and Layout when there is a block. */
export function editedOf(target: SelectionTarget | null): { sectionId: string; componentId: string | null } | null {
  if (!target) return null

  return target.level === "band"
    ? { sectionId: target.id, componentId: target.blockId }
    : { sectionId: target.sectionId, componentId: target.id }
}
