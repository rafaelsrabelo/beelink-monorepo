"use client"

// Next
import { useRouter } from "next/navigation"

// React
import { useState } from "react"

// Types
import type { Section } from "@harness-monorepo/contracts"

// App
import {
  useDeleteComponent,
  useDeleteSection,
  useReorderComponents,
  useReorderSections,
  useSections,
  useUpdateComponent,
  useUpdateSection,
} from "@/services/page/page-hooks"
import {
  changeCountOf,
  changesOf,
  hasChanges,
  publishedOf,
  toDraft,
  type ComponentDraft,
  type SectionDraft,
} from "./design-draft"
import { reconcile } from "./design-draft-reconcile"

/**
 * The arrangement as a draft in this browser, until Publish.
 *
 * That is the owner's decision, and it is not a breach of "server data never enters a store":
 * what is held here is not what the server has, it is what has not been sent yet. TanStack Query
 * stays the owner of the saved arrangement; this state owns the unsent edit, and no refetch may
 * overwrite it.
 *
 * A hook and not part of the screen, because the screen had passed the line limit and the seam
 * falls here: this knows what the draft is and how it reaches the server, and the screen knows
 * what is on the page.
 */
export function useDesignDraft(slug: string) {
  const router = useRouter()
  const page = useSections(slug)
  const reorder = useReorderSections(slug)
  const reorderComponents = useReorderComponents(slug)
  const updateSection = useUpdateSection(slug)
  const updateComponent = useUpdateComponent(slug)
  const removeSection = useDeleteSection(slug)
  const removeComponent = useDeleteComponent(slug)

  const [draft, setDraft] = useState<SectionDraft[] | null>(null)
  const [seeded, setSeeded] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  /*
    Seeded once per server answer, and reconciled rather than replaced while the arrangement is
    dirty. Replacing would throw away an unpublished arrangement mid-edit; ignoring the answer let
    the draft drift until Publish sent a partial list and the API answered 409.

    The key names every component of every band, not only the bands: a component added inside a
    band is a change to the list the panel draws, and a key that missed it would leave the panel
    listing a component the owner had just deleted. And what the draft holds of each — whether it
    shows, its layout — so a clean draft follows another tab's Publicar instead of offering to undo it.
  */
  const serverKey =
    page.data
      ?.map(
        (section) =>
          `${section.id}${section.isActive ? "" : "!"}:${section.components
            .map((c) => [c.id, c.isActive, c.span, c.display, c.columns, c.align].join("/"))
            .join("+")}`,
      )
      .join(",") ?? null

  if (page.data && seeded !== serverKey) {
    setSeeded(serverKey)
    setDraft((current) => (current && dirty ? reconcile(current, page.data) : page.data.map(toDraft)))
  }

  const rows: SectionDraft[] = draft ?? []
  const saved: Section[] = page.data ?? []

  /**
   * A new arrangement, or a change to the latest one. The change form is what lets two edits in one
   * event compose: a single-block card shows its band and its block in one click, and two values
   * built from this render's `rows` would have the second undo the first.
   */
  function edit(next: SectionDraft[] | ((current: SectionDraft[]) => SectionDraft[])) {
    setDraft((current) => (typeof next === "function" ? next(current ?? []) : next))
    setDirty(true)
  }

  function patchSection(id: string, patch: Partial<Pick<SectionDraft, "isActive">>) {
    edit((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  function patchComponent(id: string, patch: Partial<Pick<ComponentDraft, "isActive" | "span" | "display" | "columns" | "align">>) {
    edit((current) =>
      current.map((row) => ({
        ...row,
        components: row.components.map((component) =>
          component.id === id ? { ...component, ...patch } : component,
        ),
      })),
    )
  }

  /** Back to what the server holds. The seed key is cleared so the next render re-reads it. */
  function discard() {
    setDirty(false)
    setSeeded(null)
    setDraft(page.data ? page.data.map(toDraft) : null)
  }

  /**
   * Only what moved is written: an order per level where it changed, a patch per row whose
   * attributes changed. A write per row would touch `updatedAt` on everything the owner never
   * opened.
   */
  function publish() {
    if (!page.data) return

    const changes = changesOf(rows, page.data)

    Promise.all([
      ...(changes.orderChanged ? [reorder.mutateAsync(changes.ids)] : []),
      ...changes.componentOrders.map((order) => reorderComponents.mutateAsync(order)),
      ...changes.sections.map((row) =>
        updateSection.mutateAsync({ sectionId: row.id, payload: { isActive: row.isActive } }),
      ),
      ...changes.components.map((component) =>
        updateComponent.mutateAsync({ componentId: component.id, payload: publishedOf(component) }),
      ),
    ])
      .then(() => {
        setDirty(false)
        setSeeded(null)
        // The shop as served is the page's server read, the showcases' products in it: a showcase
        // shown again has none in the preview until that read is taken again.
        router.refresh()
      })
      .catch(() => {
        // The mutation's own error state is what the screen would show; the draft is kept so
        // nothing the owner arranged is lost to a failed write.
      })
  }

  /**
   * Deleted for good, and at once — not held in the draft until Publish. Publish sends an
   * arrangement, and a row that is gone has no position to send; holding the delete would also
   * mean a reload could bring back something the owner watched disappear.
   *
   * The draft drops it once the server has, and not before: the API refuses to delete what the
   * shop cannot be without, and a draft that had already dropped the row would then be arranging a
   * page with a band the shop still has. The round trip is the cost, and it is one. `onDone` is
   * how the dialog learns it may close — a refusal keeps it open, with the reason.
   */
  function removeBand(id: string, onDone: () => void) {
    removeSection.mutate(id, {
      onSuccess: () => {
        setDraft((current) => (current ? current.filter((row) => row.id !== id) : current))
        onDone()
      },
    })
  }

  function removeRow(id: string, onDone: () => void) {
    removeComponent.mutate(id, {
      onSuccess: () => {
        setDraft((current) =>
          current
            ? current.map((row) => ({ ...row, components: row.components.filter((c) => c.id !== id) }))
            : current,
        )
        onDone()
      },
    })
  }

  /**
   * Why the last delete was refused, for the dialog to say. Cleared when the dialog closes, so the
   * next question does not open under the previous answer.
   */
  const deleteError = removeSection.error ?? removeComponent.error ?? null

  function clearDeleteError() {
    removeSection.reset()
    removeComponent.reset()
  }

  return {
    rows,
    saved,
    loading: page.isPending,
    /** Touched since the last publish. It governs seeding, which has its own history. */
    dirty,
    /**
     * Actually different from the server — what the bar's status, Publish and the leave guard
     * answer to, so a band moved and moved back asks nobody anything.
     */
    changed: draft !== null && hasChanges(changesOf(rows, saved)),
    /** What Publish would write, counted — the bar's "N alterações". Zero while nothing differs. */
    changeCount: draft === null ? 0 : changeCountOf(changesOf(rows, saved)),
    publishing:
      reorder.isPending || reorderComponents.isPending || updateSection.isPending || updateComponent.isPending,
    deleting: removeSection.isPending || removeComponent.isPending,
    deleteError,
    clearDeleteError,
    edit,
    patchSection,
    patchComponent,
    discard,
    publish,
    removeBand,
    removeRow,
  }
}
