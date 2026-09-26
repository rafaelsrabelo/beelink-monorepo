"use client"

// Next
import { useRouter } from "next/navigation"

// React
import { useEffect, useRef, useState } from "react"

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
  changesOf,
  hasChanges,
  publishedOf,
  toDraft,
  type ComponentDraft,
  type SectionDraft,
} from "./design-draft"
import { reconcile } from "./design-draft-reconcile"

/** How long an arrangement rests before it is saved: long enough to take a drag as one change. */
const SAVE_DELAY_MS = 400

/**
 * The arrangement as it is being edited, saved to the page's draft on the server a moment after each
 * change. The shop does not change until Publicar: the draft is the server's, not this browser's.
 *
 * What is held here is only what has not been sent yet — not what the server has — so it is not a
 * breach of "server data never enters a store". TanStack Query stays the owner of the saved
 * arrangement; this state owns the unsent edit, and no refetch may overwrite it before it is saved.
 *
 * A hook and not part of the screen, because the screen had passed the line limit and the seam
 * falls here: this knows what the draft is and how it reaches the server, and the screen knows
 * what is on the page.
 */
export function useDesignDraft(slug: string, pageId?: string) {
  const router = useRouter()
  const page = useSections(slug, pageId)
  const reorder = useReorderSections(slug, pageId)
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
            .map((c) => [c.id, c.isActive, c.span, c.display, c.columns, c.align, c.visibleOn].join("/"))
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
    latest.current.edits += 1
  }

  function patchSection(id: string, patch: Partial<Pick<SectionDraft, "isActive">>) {
    edit((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  function patchComponent(
    id: string,
    patch: Partial<Pick<ComponentDraft, "isActive" | "span" | "display" | "columns" | "align" | "visibleOn">>,
  ) {
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

  // What the latest render holds, for a save that starts after a timer and finishes after renders.
  const latest = useRef({ rows, saved: page.data, edits: 0 })
  latest.current = { ...latest.current, rows, saved: page.data }
  const inFlight = useRef<Promise<void> | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<Error | null>(null)
  /**
   * The arrangement, sent: only what moved — an order per level where it changed, a patch per row
   * whose attributes changed — so nothing the owner never opened has its `updatedAt` touched.
   *
   * One save at a time, and another after it if the owner arranged more meanwhile. The draft stays
   * dirty until the server's answer matches it; an edit made while a save was out is not lost when
   * that save lands. A refused save drops the unsent arrangement back to what the server holds and
   * says why: retrying a write the API refuses would only refuse it again.
   */
  function flush(): Promise<void> {
    if (inFlight.current) return inFlight.current.then(() => flush())

    const { rows: now, saved: server, edits } = latest.current
    if (!server) return Promise.resolve()
    const changes = changesOf(now, server)
    if (!hasChanges(changes)) return Promise.resolve()

    setSaving(true)
    setSaveError(null)
    const run = Promise.all([
      ...(changes.orderChanged ? [reorder.mutateAsync(changes.ids)] : []),
      ...changes.componentOrders.map((order) => reorderComponents.mutateAsync(order)),
      ...changes.sections.map((row) => updateSection.mutateAsync({ sectionId: row.id, payload: { isActive: row.isActive } })),
      ...changes.components.map((component) =>
        updateComponent.mutateAsync({ componentId: component.id, payload: publishedOf(component) }),
      ),
    ])
      .then(() => {
        if (latest.current.edits === edits) setDirty(false)
        setSeeded(null)
        // The preview's shelves are the page's server read: a showcase shown again has none until it is taken again.
        router.refresh()
      })
      .catch((error: unknown) => {
        discard()
        setSaveError(error instanceof Error ? error : new Error(String(error)))
      })
      .finally(() => {
        inFlight.current = null
        setSaving(false)
      })

    inFlight.current = run
    return run
  }

  const changed = draft !== null && hasChanges(changesOf(rows, saved))

  // Saved a moment after the last change, not on every one: a drag across four bands is one save.
  // `flush` reads the latest render through its ref; the arrangement is what schedules it.
  useEffect(() => {
    if (!changed) return
    const timer = setTimeout(() => void flush(), SAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [rows, changed]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Publicar, after whatever is still to be saved: the freeze is queued behind those writes. */
  function publish(onPublished?: () => void) {
    void flush().then(() => onPublished?.())
  }

  /**
   * Deleted from the draft at once, and dropped here once the server has, not before: the API
   * refuses to delete what the shop cannot be without, and a row dropped early would leave the
   * editor arranging a page the draft does not hold. `onDone` is how the dialog learns it may
   * close — a refusal keeps it open, with the reason.
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

  /** Why the last delete was refused, for the dialog to say. Cleared when the dialog closes. */
  const deleteError = removeSection.error ?? removeComponent.error ?? null

  function clearDeleteError() {
    removeSection.reset()
    removeComponent.reset()
  }

  return {
    rows,
    saved,
    loading: page.isPending,
    /** Touched since it was last saved. It governs seeding, which has its own history. */
    dirty,
    /** Arranged here and not yet on the server — about to be saved, or being saved. */
    saving: saving || changed,
    /** Why the last save was refused, in the API's code; the arrangement went back to the server's. */
    saveError,
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
