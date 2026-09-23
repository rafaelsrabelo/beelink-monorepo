"use client"

// React
import { useEffect, useState } from "react"

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
import { changesOf, reconcile, toDraft, type ComponentDraft, type SectionDraft } from "./design-draft"

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
    listing a component the owner had just deleted.
  */
  const serverKey =
    page.data
      ?.map((section) => `${section.id}:${section.components.map((component) => component.id).join("+")}`)
      .join(",") ?? null

  if (page.data && seeded !== serverKey) {
    setSeeded(serverKey)
    setDraft((current) => (current && dirty ? reconcile(current, page.data) : page.data.map(toDraft)))
  }

  useEffect(() => {
    if (!dirty) return

    // The browser writes its own wording here; the screen says `leaveWarning` in ours.
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warn)

    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const rows: SectionDraft[] = draft ?? []
  const saved: Section[] = page.data ?? []

  function edit(next: SectionDraft[]) {
    setDraft(next)
    setDirty(true)
  }

  function patchComponent(id: string, patch: Partial<Pick<ComponentDraft, "isActive" | "layout">>) {
    edit(
      rows.map((row) => ({
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
        updateComponent.mutateAsync({
          componentId: component.id,
          payload: { layout: component.layout, isActive: component.isActive },
        }),
      ),
    ])
      .then(() => {
        setDirty(false)
        setSeeded(null)
      })
      .catch(() => {
        // The mutation's own error state is what the screen would show; the draft is kept so
        // nothing the owner arranged is lost to a failed write.
      })
  }

  /**
   * Deleted for good, and immediately — not held in the draft until Publish. Publish sends an
   * arrangement, and a row that is gone has no position to send; holding the delete would also
   * mean a reload could bring back something the owner watched disappear.
   *
   * The draft drops it too, or the preview keeps drawing what the shop no longer has.
   */
  function removeBand(id: string) {
    setDraft((current) => (current ? current.filter((row) => row.id !== id) : current))
    removeSection.mutate(id)
  }

  function removeRow(id: string) {
    setDraft((current) =>
      current
        ? current.map((row) => ({ ...row, components: row.components.filter((c) => c.id !== id) }))
        : current,
    )
    removeComponent.mutate(id)
  }

  return {
    rows,
    saved,
    loading: page.isPending,
    dirty,
    publishing:
      reorder.isPending || reorderComponents.isPending || updateSection.isPending || updateComponent.isPending,
    deleting: removeSection.isPending || removeComponent.isPending,
    edit,
    patchComponent,
    discard,
    publish,
    removeBand,
    removeRow,
  }
}
