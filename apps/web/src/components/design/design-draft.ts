// Types
import type {
  ComponentDisplay,
  ComponentKind,
  ComponentSpan,
  Section,
  StoreComponent,
  TextAlign,
  UpdateComponentPayload,
} from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { sameLayout } from "./component-layout"

/**
 * One component as the editor holds it while the page is being arranged.
 *
 * A shape of its own and not the wire `StoreComponent`, because these are the only fields the
 * arrangement can change. Everything a sheet saves straight to the server — a title, a paragraph,
 * the slides — stays out of it on purpose, and the reason was measured: the draft is re-seeded
 * only when a row arrives or leaves, so a colour saved while it held a copy of the colour sat
 * under that stale copy until the page was reloaded. What the draft does not hold cannot go stale.
 *
 * The layout is here and nowhere else — the slice, the format, the columns and the alignment — so
 * nothing but Publicar writes it, and there is no second copy for it to go stale under.
 */
export interface ComponentDraft {
  id: string
  kind: ComponentKind
  span: ComponentSpan
  display: ComponentDisplay | null
  columns: number | null
  align: TextAlign | null
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

export function toComponentDraft(component: StoreComponent): ComponentDraft {
  return {
    id: component.id,
    kind: component.kind,
    span: component.span,
    display: component.display,
    columns: component.columns,
    align: component.align,
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

      return !!was && (!sameLayout(was, component) || was.isActive !== component.isActive)
    }),
  }
}

/**
 * What Publicar writes for a block that changed: its slice, whether it shows, and how it lays out
 * what it holds. The format only where there is one — a banner saved before it could choose holds
 * none, and the API refuses a banner told it has none.
 */
export function publishedOf(component: ComponentDraft): UpdateComponentPayload {
  return {
    span: component.span,
    isActive: component.isActive,
    columns: component.columns,
    align: component.align,
    ...(component.display ? { display: component.display } : {}),
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
 * How many writes Publish would send — the number the editor's bar shows as "N alterações". The
 * order of the bands is one write whatever moved; every other change is one row.
 */
export function changeCountOf(changes: ReturnType<typeof changesOf>): number {
  return (
    (changes.orderChanged ? 1 : 0) + changes.sections.length + changes.componentOrders.length + changes.components.length
  )
}

/**
 * Where the API should put a row for a "+" at `index` of the draft: right after the draft row above
 * the "+", counted in the server's order, or first when nothing is above it. `reconcile` places the
 * newcomer after that same row, so it lands where the "+" was whether or not the draft has been
 * rearranged since the last publish.
 */
export function serverPlaceOf(draftIds: readonly string[], savedIds: readonly string[], index: number): number {
  if (index === 0) return 0

  const above = savedIds.indexOf(draftIds[index - 1] ?? "")
  return above < 0 ? savedIds.length : above + 1
}

/**
 * The kinds the gallery stops offering once the page holds one: the strip, which sits above the
 * header and has nowhere to be a second time. A showcase is not among them — a shop may draw as
 * many shelves as it has sources.
 */
export function takenKindsOf(rows: readonly SectionDraft[]): ComponentKind[] {
  return componentsOf(rows)
    .map((component) => component.kind)
    .filter((kind) => kind === "ANNOUNCEMENT")
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
