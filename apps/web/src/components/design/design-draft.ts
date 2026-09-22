// Types
import type { PublicSection, Section, SectionKind, ShowcaseLayout } from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/**
 * One block as the editor holds it while the page is being arranged.
 *
 * A shape of its own and not the wire `Section`, because these are the only fields the arrangement
 * can change. A draft carrying the whole block would invite a screen to edit a title here, which
 * is the block form's job, and would make "what actually moved" impossible to answer without
 * comparing fifteen fields.
 */
export interface Draft {
  id: string
  kind: SectionKind
  /** Null on a block that draws no heading of its own. */
  title: string | null
  imageUrl: string | null
  layout: ShowcaseLayout
  isActive: boolean
}

export function toDraft(section: Section): Draft {
  return {
    id: section.id,
    kind: section.kind,
    title: section.title,
    imageUrl: section.imageUrl,
    layout: section.layout,
    isActive: section.isActive,
  }
}

/** The ids the landing page draws, in order. */
export function orderedIdsOf(rows: readonly Draft[]): string[] {
  return rows.map((row) => row.id)
}

/**
 * The draft in the order it was dropped in.
 *
 * It replaced a function that read a boolean side off where a sentinel row landed. That sentinel
 * is gone: the product rails are a row with a position like every other block, so ordering them is
 * ordering a list — which is what the whole rename was for.
 */
export function applyOrder(rows: readonly Draft[], ids: readonly string[]): Draft[] {
  return ids.map((id) => rows.find((row) => row.id === id)).filter((row) => !!row)
}

/**
 * What has to be written, comparing the draft against what the server holds.
 *
 * One patch per block whose visibility or size moved, and none for the ones that did not — a write
 * per row would touch `updatedAt` on blocks nobody edited. The order goes as the whole list or not
 * at all, because the API refuses a partial one: the rows it omits keep positions that now collide.
 */
export function changesOf(rows: readonly Draft[], saved: readonly Section[]) {
  const byId = new Map(saved.map((section) => [section.id, section]))
  const ids = rows.map((row) => row.id)

  return {
    ids,
    orderChanged: saved.some((section, at) => section.id !== ids[at]),
    changed: rows.filter((row) => {
      const was = byId.get(row.id)

      return !!was && (was.layout !== row.layout || was.isActive !== row.isActive)
    }),
  }
}

/**
 * What a block is called in the editor.
 *
 * A block the shopkeeper titled is called by that title; one they have not is called by its kind.
 * The alternative — a row reading "Sem título" — tells them which blocks are unfinished and
 * nothing about which is which, and on a page of four of them that is a list of four identical
 * rows.
 */
export function labelOf(kind: SectionKind, title: string | null, messages: UiMessages): string {
  return title?.trim() || messages.design.kinds[kind]
}

/**
 * The draft as the shop window would be served it.
 *
 * Hidden blocks are dropped here, exactly as the API drops them from `PublicStore.sections`, so
 * the preview and the live page agree about what "hidden" means without either being told twice.
 * The saved block supplies the fields the arrangement does not hold — its subtitle, its resolved
 * address and its items — because those are not what dragging changes.
 */
export function previewOf(rows: readonly Draft[], saved: readonly Section[]): PublicSection[] {
  const byId = new Map(saved.map((section) => [section.id, section]))

  return rows
    .filter((row) => row.isActive)
    .map((row) => {
      const was = byId.get(row.id)

      return {
        id: row.id,
        kind: row.kind,
        title: row.title,
        subtitle: was?.subtitle ?? null,
        imageUrl: row.imageUrl,
        layout: row.layout,
        width: was?.width ?? "FULL",
        // Resolved by the API from the slug the target has now. The draft never changes a target,
        // so the saved answer is still the right one.
        href: null,
        external: was?.target === "EXTERNAL",
        items: was?.items ?? [],
      } satisfies PublicSection
    })
}
