"use client"

// React
import { useState } from "react"

// Types
import type { ComponentKind, PublicProductCategory, PublicStore, StoreColors } from "@harness-monorepo/contracts"

// UI
import { bandLabelOf } from "@harness-monorepo/ui/blocks/design/band-label"
import { ConfirmDelete } from "@harness-monorepo/ui/blocks/shared/confirm-delete"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { useCreateComponent, useCreateSection } from "@/services/page/page-hooks"
import { useStoreColorPresets, useUpdateStoreColors } from "@/services/stores/store-hooks"
import { BandEditor } from "./band-editor"
import { ComponentEditor } from "./component-editor"
import { DesignHeader } from "./design-header"
import { DesignPanel } from "./design-panel"
import type { InsertAt } from "@harness-monorepo/ui/blocks/design/band-arrangement"
import { BlockGallery } from "@harness-monorepo/ui/blocks/design/block-gallery"

// App
import { DesignPreviewPane } from "./design-preview-pane"
import { applyComponentOrder, applyOrder, labelOf, orderedIdsOf, serverPlaceOf, takenKindsOf } from "./design-draft"
import { arrangementOf, previewOf, shelvesOf } from "./design-draft-preview"
import { pageErrorCopy } from "./page-error-copy"
import { useDesignDraft } from "./use-design-draft"
import { useShopRefresh } from "./use-shop-refresh"

import type { WebMessages } from "@/locales"

export interface DesignScreenProps {
  /**
   * The shop exactly as a visitor is served it, fetched by the page through the same functions the
   * storefront itself uses. It is not the owner's `Store`: that one carries an address the window
   * would then draw, and counts the shop window never shows.
   */
  store: PublicStore
  categories: readonly PublicProductCategory[]
  year: number
  messages: UiMessages
  /** The app's own sentences — where an API `errorCode` becomes copy. */
  web: WebMessages
}

/** Spelled out so a fifth colour is a compile error here rather than a field nobody compares. */
const COLOUR_KEYS = ["background", "primary", "header", "footer"] as const satisfies readonly (keyof StoreColors)[]

/** What the dialog is about to delete. A band takes everything in it; a component leaves its band. */
type PendingDelete = { level: "band" | "component"; id: string; name: string }

/**
 * The shop on the left, its bands arranged on the right.
 *
 * The arrangement is a draft until Publish — `useDesignDraft` says why. What a component says, and
 * what colour a band is, save on their own the moment the owner hits save in the sheet: those are
 * things they want to see land, not an order to hold back.
 */
export function DesignScreen({ store, categories, year, messages, web }: DesignScreenProps) {
  const text = messages.design
  const slug = store.slug

  const draft = useDesignDraft(slug)
  const presets = useStoreColorPresets()
  const saveColors = useUpdateStoreColors(slug)
  const addSection = useCreateSection(slug)
  const addToBand = useCreateComponent(slug)
  const shelves = shelvesOf(store.sections)
  const [insertAt, setInsertAt] = useState<InsertAt | null>(null)
  // Sent where the "+" is, counted in the server's order: see `serverPlaceOf`.
  const insert = (kind: ComponentKind) => {
    if (insertAt?.level === "band") {
      const position = serverPlaceOf(rows.map((row) => row.id), saved.map((row) => row.id), insertAt.index)
      addSection.mutate(
        { component: { kind }, position },
        { onSuccess: (section) => (section.components[0] ? opened(section.components[0]) : undefined) },
      )
    } else if (insertAt?.level === "block") {
      const { sectionId, index } = insertAt
      const ids = (bands: readonly { id: string; components: readonly { id: string }[] }[]) =>
        bands.find((band) => band.id === sectionId)?.components.map((component) => component.id) ?? []
      const position = serverPlaceOf(ids(rows), ids(saved), index)
      addToBand.mutate({ sectionId, payload: { kind, position } }, { onSuccess: opened })
    }
  }
  const shop = useShopRefresh()
  // A showcase's products are resolved on the server, so a new or saved one sends the page for them.
  const opened = (component: { id: string; kind: ComponentKind }) => {
    setEditingComponent(component.id)
    if (component.kind === "PRODUCTS") shop.refresh(component.id)
  }

  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [editingComponent, setEditingComponent] = useState<string | null>(null)
  const [editingBand, setEditingBand] = useState<string | null>(null)

  /*
    The palette is its own draft, and it saves on its own — a colour is the kind of thing you want
    to see land, and `PUT /stores/:slug/colors` exists precisely so a colour save never re-posts
    the whole shop over whatever another screen just wrote.
  */
  const [palette, setPalette] = useState<StoreColors>(store.colors)
  const paletteChanged = COLOUR_KEYS.some((key) => palette[key] !== store.colors[key])

  const { rows, saved } = draft

  // The two the shop may only have one of, and the two a page of this kind cannot hold. Computed
  // once because the gallery is now offered from two places — the top of the panel, and each
  // band's foot — and a kind refused in one and offered in the other would be a bug with no
  // symptom until the API answered 409.
  const unavailableKinds: ComponentKind[] =
    store.type === "INSTITUTIONAL" ? ["PRODUCTS", "CATEGORIES"] : ["CONTACT"]
  const takenKinds = takenKindsOf(rows)
  const bandName = (id: string) =>
    bandLabelOf(saved.find((section) => section.id === id)?.name, rows.findIndex((row) => row.id === id) + 1, messages)

  const editing = saved.flatMap((section) => section.components).find((c) => c.id === editingComponent) ?? null
  const editingSection = saved.find((section) => section.id === editingBand) ?? null

  return (
    <div className="flex w-full flex-col gap-4">
      <DesignHeader
        changed={draft.changed}
        publishing={draft.publishing}
        onPublish={draft.publish}
        onDiscard={draft.discard}
        messages={messages}
      />

      <ConfirmDelete
        question={
          pendingDelete
            ? format(pendingDelete.level === "band" ? text.deleteBandConfirm : text.deleteBlockConfirm, {
                name: pendingDelete.name,
              })
            : null
        }
        pending={draft.deleting}
        // The dialog stays open until the server agrees; a refusal is said under the question.
        {...(draft.deleteError ? { detail: pageErrorCopy(draft.deleteError, web) } : {})}
        onConfirm={() => {
          if (!pendingDelete) return
          const { level, id } = pendingDelete
          const done = () => setPendingDelete(null)
          if (level === "band") draft.removeBand(id, done)
          else draft.removeRow(id, done)
        }}
        onCancel={() => {
          setPendingDelete(null)
          draft.clearDeleteError()
        }}
        messages={messages}
      />

      <BandEditor
        slug={slug}
        section={editingSection}
        position={rows.findIndex((row) => row.id === editingBand) + 1}
        pageBackground={palette.background}
        onClose={() => setEditingBand(null)}
        messages={messages}
      />

      <div className="flex flex-col gap-4 @4xl/main:flex-row">
        <DesignPreviewPane
          store={store}
          categories={categories}
          year={year}
          sections={previewOf(rows, saved, shelves)}
          shelves={shelves}
          refreshingId={shop.refreshingId}
          colors={palette}
          orderedIds={orderedIdsOf(rows)}
          onReorder={(ids) => draft.edit(applyOrder(rows, ids))}
          onEdit={setEditingComponent}
          selectedId={editingComponent}
          messages={messages}
        />

        <DesignPanel
          bands={arrangementOf(rows, saved, shelves, categories.length)}
          loading={draft.loading}
          onReorder={(ids) => draft.edit(applyOrder(rows, ids))}
          onReorderComponents={(sectionId, ids) => draft.edit(applyComponentOrder(rows, sectionId, ids))}
          onToggleBand={(id, isActive) => draft.patchSection(id, { isActive })}
          onEditBand={setEditingBand}
          onDeleteBand={(id) => setPendingDelete({ level: "band", id, name: bandName(id) })}
          onToggle={(id, isActive) => draft.patchComponent(id, { isActive })}
          onSpanChange={(id, span) => draft.patchComponent(id, { span })}
          onDelete={(id) => {
            const component = saved.flatMap((section) => section.components).find((c) => c.id === id)
            if (component) {
              setPendingDelete({ level: "component", id, name: labelOf(component.kind, component.title, messages) })
            }
          }}
          onEdit={setEditingComponent}
          onInsert={setInsertAt}
          inserting={addSection.isPending || addToBand.isPending}
          inspector={
            <ComponentEditor
              slug={slug}
              component={editing}
              bandBackground={saved.find((section) => section.id === editing?.sectionId)?.background ?? null}
              pageBackground={palette.background}
              categoriesShown={categories.length}
              shelfEmpty={editing ? shelves.get(editing.id)?.items.length === 0 : false}
              onClose={() => setEditingComponent(null)}
              onSaved={(component) => (component.kind === "PRODUCTS" ? shop.refresh(component.id) : undefined)}
              messages={messages}
              web={web}
            />
          }
          selectedId={editingComponent}
          palette={palette}
          onPalette={setPalette}
          presets={presets.data ?? []}
          paletteChanged={paletteChanged}
          savingColours={saveColors.isPending}
          onSaveColours={() => saveColors.mutate(palette)}
          messages={messages}
        />
      </div>

      {/*
        The one gallery every "+" opens, already knowing where the block goes. Adding is a saved
        write, not a draft edit — a reload must not lose what the owner watched appear — and the form
        then opens on the block just created, so nothing lands somewhere the owner has to find it.
      */}
      <BlockGallery
        open={insertAt !== null}
        onOpenChange={(open) => (open ? undefined : setInsertAt(null))}
        // The strip is the one kind a page has once; a site has no catalogue, a shop no form leads.
        taken={takenKinds}
        unavailable={unavailableKinds}
        onAdd={insert}
        messages={messages}
      />
    </div>
  )
}
