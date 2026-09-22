"use client"

// React
import { useEffect, useState } from "react"

// Types
import type { PublicProductCategory, PublicStore, StoreColors } from "@harness-monorepo/contracts"

// UI
import { ConfirmDelete } from "@harness-monorepo/ui/blocks/shared/confirm-delete"
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Button } from "@harness-monorepo/ui/components/button"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { HomeBand } from "@/lib/storefront-data"
import {
  useCreateSection,
  useDeleteSection,
  useReorderSections,
  useSections,
  useUpdateSection,
} from "@/services/sections/section-hooks"
import { useStoreColorPresets, useUpdateStoreColors } from "@/services/stores/store-hooks"
import { DesignPanel } from "./design-panel"
import { DesignPreviewPane } from "./design-preview-pane"
import {
  applyOrder,
  changesOf,
  isEmptyBlock,
  labelOf,
  orderedIdsOf,
  previewOf,
  reconcile,
  toDraft,
  type Draft,
} from "./design-draft"

export interface DesignScreenProps {
  /**
   * The shop exactly as a visitor is served it, fetched by the page through the same functions the
   * storefront itself uses. It is not the owner's `Store`: that one carries an address the window
   * would then draw, and counts the shop window never shows.
   */
  store: PublicStore
  categories: readonly PublicProductCategory[]
  /** The rails, already loaded — the same shape the shop window's home is built from. */
  bands: readonly HomeBand[]
  year: number
  messages: UiMessages
}

/**
 * The shop on the left, its posters arranged on the right.
 *
 * **The arrangement is a draft in this browser until Publish.** That is the owner's decision, and
 * it is not a breach of "server data never enters a store": what is held here is not what the
 * server has, it is what has not been sent yet. TanStack Query stays the owner of the saved
 * arrangement; this state owns the unsent edit, and no refetch may overwrite it.
 *
 * The cost is real and is warned about rather than hidden — a reload before publishing loses it.
 */
/** Spelled out so a fifth colour is a compile error here rather than a field nobody compares. */
const COLOUR_KEYS = ["background", "primary", "header", "footer"] as const satisfies readonly (keyof StoreColors)[]

export function DesignScreen({ store, categories, bands, year, messages }: DesignScreenProps) {
  const text = messages.design
  const slug = store.slug

  const banners = useSections(slug)
  const presets = useStoreColorPresets()
  const saveColors = useUpdateStoreColors(slug)
  const addSection = useCreateSection(slug)
  const removeSection = useDeleteSection(slug)
  const reorder = useReorderSections(slug)
  const update = useUpdateSection(slug)

  const [draft, setDraft] = useState<Draft[] | null>(null)
  const [seeded, setSeeded] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  /**
   * The block waiting to be deleted.
   *
   * Deleted for good, and immediately — not held in the draft until Publish. Publish sends an
   * arrangement, and a row that is gone has no position to send; holding the delete would also
   * mean a reload could bring back a block the owner watched disappear.
   */
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null)

  /*
    The palette is its own draft, and it saves on its own.

    Not part of the arrangement's Publish, because the two are different promises: an arrangement
    is held back until the owner says so, and a colour is the kind of thing you want to see land.
    They also go to different endpoints — `PUT /stores/:slug/colors` exists precisely so a colour
    save never re-posts the whole shop over whatever another screen just wrote.
  */
  const [palette, setPalette] = useState<StoreColors>(store.colors)
  const paletteChanged = COLOUR_KEYS.some((key) => palette[key] !== store.colors[key])

  /*
    Seeded once per server answer, and reconciled rather than replaced while the arrangement is
    dirty.

    Replacing would throw away an unpublished arrangement mid-edit. Ignoring the answer, which is
    what this used to do, let the draft drift: a block created or deleted after the owner had moved
    anything never reached it, Publish sent the list it had, and the reorder endpoint answered 409
    to a partial one. `reconcile` keeps the order they made and only adds and removes rows.
  */
  const serverKey = banners.data?.map((banner) => banner.id).join(",") ?? null
  if (banners.data && seeded !== serverKey) {
    setSeeded(serverKey)
    setDraft((current) => (current && dirty ? reconcile(current, banners.data) : banners.data.map(toDraft)))
  }

  useEffect(() => {
    if (!dirty) return

    // The browser writes its own wording here; `text.leaveWarning` is what the screen says.
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warn)

    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const rows = draft ?? []
  const savedById = new Map((banners.data ?? []).map((section) => [section.id, section]))

  // Said on the row rather than left to be noticed: a block that draws nothing is missing from the
  // preview, and without this the panel and the page disagree with no explanation on screen.
  const rowsWithEmptiness = rows.map((row) => ({
    ...row,
    empty: isEmptyBlock(row.kind, row.title, savedById.get(row.id)?.items ?? []),
  }))

  function edit(next: Draft[]) {
    setDraft(next)
    setDirty(true)
  }

  /** Back to what the server holds. The seed key is cleared so the next render re-reads it. */
  function discard() {
    setDirty(false)
    setSeeded(null)
    setDraft(banners.data ? banners.data.map(toDraft) : null)
  }

  function publish() {
    if (!banners.data) return

    const { ids, orderChanged, changed } = changesOf(rows, banners.data)

    Promise.all([
      ...(orderChanged ? [reorder.mutateAsync(ids)] : []),
      ...changed.map((row) =>
        update.mutateAsync({
          sectionId: row.id,
          payload: { layout: row.layout, isActive: row.isActive },
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

  const publishing = reorder.isPending || update.isPending

  return (
    <div className="flex w-full flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{text.title}</h1>
          <p className="text-muted-foreground text-sm">{text.description}</p>
        </div>

        <div className="flex items-center gap-2">
          {dirty ? <Badge variant="outline">{text.unpublished}</Badge> : null}
          {dirty ? (
            <Button type="button" variant="ghost" disabled={publishing} onClick={discard}>
              {text.discard}
            </Button>
          ) : null}
          <Button type="button" disabled={!dirty || publishing} onClick={publish}>
            {publishing ? text.publishing : text.publish}
          </Button>
        </div>
      </header>

      {dirty ? <p className="text-muted-foreground text-sm">{text.leaveWarning}</p> : null}

      <ConfirmDelete
        question={pendingDelete ? format(text.deleteBlockConfirm, { name: pendingDelete.name }) : null}
        pending={removeSection.isPending}
        onConfirm={() => {
          if (!pendingDelete) return
          const id = pendingDelete.id
          setPendingDelete(null)
          // The draft drops it too, or the preview keeps drawing a block the shop no longer has.
          setDraft((current) => (current ? current.filter((row) => row.id !== id) : current))
          removeSection.mutate(id)
        }}
        onCancel={() => setPendingDelete(null)}
        messages={messages}
      />

      <div className="flex flex-col gap-4 @4xl/main:flex-row">
        <DesignPreviewPane
          store={store}
          categories={categories}
          bands={bands}
          year={year}
          sections={previewOf(rows, banners.data ?? [])}
          colors={palette}
          orderedIds={orderedIdsOf(rows)}
          onReorder={(ids) => edit(applyOrder(rows, ids))}
          messages={messages}
        />

        <DesignPanel
          rows={rowsWithEmptiness}
          loading={banners.isPending}
          onReorder={(ids) => edit(applyOrder(rows, ids))}
          onToggle={(id, isActive) =>
            edit(rows.map((row) => (row.id === id ? { ...row, isActive } : row)))
          }
          onLayoutChange={(id, layout) =>
            edit(rows.map((row) => (row.id === id ? { ...row, layout } : row)))
          }
          onDelete={(id) => {
            const row = rows.find((candidate) => candidate.id === id)
            if (row) setPendingDelete({ id, name: labelOf(row.kind, row.title, messages) })
          }}
          onAdd={(kind) => addSection.mutate({ kind })}
          adding={addSection.isPending}
          palette={palette}
          onPalette={setPalette}
          presets={presets.data ?? []}
          paletteChanged={paletteChanged}
          savingColours={saveColors.isPending}
          onSaveColours={() => saveColors.mutate(palette)}
          messages={messages}
        />
      </div>
    </div>
  )
}
