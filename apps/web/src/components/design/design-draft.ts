// Types
import type { ComponentKind, ComponentSpan, Section, StoreComponent } from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/**
 * One component as the editor holds it while the page is being arranged.
 *
 * A shape of its own and not the wire `StoreComponent`, because these are the only fields the
 * arrangement can change. Everything a sheet saves straight to the server — a title, a paragraph,
 * the slides — stays out of it on purpose, and the reason was measured: the draft is re-seeded
 * only when a row arrives or leaves, so a colour saved while it held a copy of the colour sat
 * under that stale copy until the page was reloaded. What the draft does not hold cannot go stale.
 */
export interface ComponentDraft {
  id: string
  kind: ComponentKind
  span: ComponentSpan
  isActive: boolean
}

/**
 * One band, and what is in it. The two levels the shopkeeper asked for, as the editor holds them.
 *
 * No width and no colour here, for the reason `ComponentDraft` states: both are saved by the band's
 * own sheet, and the projections read them from what the server holds.
 */
export interface SectionDraft {
  id: string
  isActive: boolean
  components: ComponentDraft[]
}

function toComponentDraft(component: StoreComponent): ComponentDraft {
  return {
    id: component.id,
    kind: component.kind,
    span: component.span,
    isActive: component.isActive,
  }
}

export function toDraft(section: Section): SectionDraft {
  return {
    id: section.id,
    isActive: section.isActive,
    components: section.components.map(toComponentDraft),
  }
}

/** The bands the landing page draws, in order. */
export function orderedIdsOf(rows: readonly SectionDraft[]): string[] {
  return rows.map((row) => row.id)
}

export function applyOrder(rows: readonly SectionDraft[], ids: readonly string[]): SectionDraft[] {
  return ids.map((id) => rows.find((row) => row.id === id)).filter((row) => !!row)
}

/** One band's components, in the order they were dropped in. The band itself does not move. */
export function applyComponentOrder(
  rows: readonly SectionDraft[],
  sectionId: string,
  ids: readonly string[],
): SectionDraft[] {
  return rows.map((row) =>
    row.id === sectionId
      ? {
          ...row,
          components: ids
            .map((id) => row.components.find((component) => component.id === id))
            .filter((component) => !!component),
        }
      : row,
  )
}

/** Every component of the draft, whichever band it is in. */
export function componentsOf(rows: readonly SectionDraft[]): ComponentDraft[] {
  return rows.flatMap((row) => row.components)
}

/**
 * What has to be written, comparing the draft against what the server holds.
 *
 * One patch per row that actually moved, and none for the ones that did not — a write per row
 * would touch `updatedAt` on everything the owner never opened. An order goes as the whole list or
 * not at all, because the API refuses a partial one: the rows it omits keep positions that now
 * collide.
 */
export function changesOf(rows: readonly SectionDraft[], saved: readonly Section[]) {
  const savedSections = new Map(saved.map((section) => [section.id, section]))
  const savedComponents = new Map(
    saved.flatMap((section) => section.components.map((component) => [component.id, component])),
  )

  const ids = rows.map((row) => row.id)

  return {
    ids,
    orderChanged: saved.some((section, at) => section.id !== ids[at]),
    sections: rows.filter((row) => {
      const was = savedSections.get(row.id)

      return !!was && was.isActive !== row.isActive
    }),
    /** Per band, the new order of what is inside it — only where it changed. */
    componentOrders: rows
      .map((row) => ({ sectionId: row.id, ids: row.components.map((component) => component.id) }))
      .filter(({ sectionId, ids: within }) => {
        const was = savedSections.get(sectionId)

        return !!was && was.components.some((component, at) => component.id !== within[at])
      }),
    components: componentsOf(rows).filter((component) => {
      const was = savedComponents.get(component.id)

      return !!was && (was.span !== component.span || was.isActive !== component.isActive)
    }),
  }
}

/**
 * Whether anything in the draft actually differs from what the server holds.
 *
 * Asked of `changesOf` rather than tracked, because a flag set on every touch says "unpublished"
 * about a band moved and moved back — and publishing then fires `Promise.all([])`, which resolves
 * with no request, flashes "Publicando…" and clears a badge that was never true.
 */
export function hasChanges(changes: ReturnType<typeof changesOf>): boolean {
  return (
    changes.orderChanged ||
    changes.sections.length > 0 ||
    changes.componentOrders.length > 0 ||
    changes.components.length > 0
  )
}

/**
 * What a component is called in the editor.
 *
 * One the shopkeeper titled is called by that title; one they have not is called by its kind. The
 * alternative — a row reading "Sem título" — tells them which are unfinished and nothing about
 * which is which, and on a page of four of them that is a list of four identical rows.
 */
export function labelOf(kind: ComponentKind, title: string | null, messages: UiMessages): string {
  return title?.trim() || messages.design.kinds[kind]
}

/**
 * Whether the shop window would draw anything at all for this component.
 *
 * The one rule that has to agree with the renderer, so it is written once here and named after
 * what it answers. Each clause mirrors a `return null` on the other side: a banner with no
 * pictures, a heading with no words, a promises band with no promises.
 *
 * It exists because a silent disagreement was reported: the panel listed blocks the preview did
 * not draw, and nothing on the screen said why.
 */
export function isEmptyComponent(
  kind: ComponentKind,
  title: string | null,
  body: string | null,
  items: readonly unknown[],
): boolean {
  if (kind === "BANNER" || kind === "BENEFITS") return items.length === 0
  if (kind === "HEADING" || kind === "ANNOUNCEMENT") return !title?.trim()
  if (kind === "TEXT") return !body?.trim()

  return false
}

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
 * and new ones land at the end — which is where the API puts a new one anyway.
 */
export function reconcile(draft: readonly SectionDraft[], saved: readonly Section[]): SectionDraft[] {
  const bySaved = new Map(saved.map((section) => [section.id, section]))

  const kept = draft
    .filter((row) => bySaved.has(row.id))
    .map((row) => {
      const was = bySaved.get(row.id)!
      const known = new Set(was.components.map((component) => component.id))
      const held = row.components.filter((component) => known.has(component.id))
      const seen = new Set(held.map((component) => component.id))

      return {
        ...row,
        components: [
          ...held,
          ...was.components.filter((component) => !seen.has(component.id)).map(toComponentDraft),
        ],
      }
    })

  const seen = new Set(kept.map((row) => row.id))

  return [...kept, ...saved.filter((section) => !seen.has(section.id)).map(toDraft)]
}
