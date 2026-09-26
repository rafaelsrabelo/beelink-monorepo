// App
import { applyComponentOrder, applyOrder, type SectionDraft } from "./design-draft"

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

/**
 * One stop of the editor's ↑↓, keyed as the structure's rows, the preview's blocks and the bar mark
 * themselves with `data-design-node`: a band by its id, a block by its own. A target's key is its id.
 */
export interface DesignNode {
  key: string
  selection: DesignSelection
}

/**
 * Every band and block in the structure's order, hidden ones too. A band of one block is one stop,
 * as its card is one row, and choosing it chooses the block, as a click on the card does.
 */
export function nodesOf(rows: readonly SectionDraft[]): DesignNode[] {
  return rows.flatMap((row) => {
    const [only, second] = row.components
    if (only && !second) return [{ key: row.id, selection: { level: "block" as const, id: only.id } }]

    return [
      { key: row.id, selection: { level: "band" as const, id: row.id } },
      ...row.components.map((component) => ({ key: component.id, selection: { level: "block" as const, id: component.id } })),
    ]
  })
}

/** A block's key among the stops: its band's when it is alone there, as `nodesOf` has it. */
export function blockKeysOf(rows: readonly SectionDraft[]): (componentId: string) => string {
  const lone = new Map(
    rows.flatMap((row) => {
      const [only, second] = row.components
      return only && !second ? [[only.id, row.id] as const] : []
    }),
  )
  return (componentId) => lone.get(componentId) ?? componentId
}

/** The stop before or after `key`; from nowhere, the first or the last. Null past either end. */
export function neighbourOf(nodes: readonly DesignNode[], key: string | null, step: 1 | -1): DesignNode | null {
  const at = key === null ? -1 : nodes.findIndex((node) => node.key === key)
  if (at === -1) return (step > 0 ? nodes[0] : nodes.at(-1)) ?? null

  return nodes[at + step] ?? null
}

function swapped(ids: readonly string[], id: string, step: 1 | -1): { ids: string[]; to: number } | null {
  const at = ids.indexOf(id)
  const to = at + step
  if (at === -1 || to < 0 || to >= ids.length) return null

  const next = [...ids]
  ;[next[at], next[to]] = [ids[to]!, id]
  return { ids: next, to }
}

/**
 * The draft with the target one step up or down, and where it landed, one-based; null at an end.
 * A block moves within its band: into the next band is the structure's drag, which writes at once.
 */
export function movedBy(
  rows: readonly SectionDraft[],
  target: SelectionTarget,
  step: 1 | -1,
): { rows: SectionDraft[]; position: number } | null {
  if (target.level === "band") {
    const moved = swapped(rows.map((row) => row.id), target.id, step)
    return moved ? { rows: applyOrder(rows, moved.ids), position: moved.to + 1 } : null
  }

  const band = rows.find((row) => row.id === target.sectionId)
  const moved = band ? swapped(band.components.map((component) => component.id), target.id, step) : null
  return band && moved ? { rows: applyComponentOrder(rows, band.id, moved.ids), position: moved.to + 1 } : null
}
