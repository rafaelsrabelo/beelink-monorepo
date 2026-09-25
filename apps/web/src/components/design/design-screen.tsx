"use client"

// React
import { useState } from "react"

// Types
import type { ComponentKind, PublicProductCategory, PublicStore, StoreColors } from "@harness-monorepo/contracts"

// UI
import { bandLabelOf } from "@harness-monorepo/ui/blocks/design/band-label"
import { DesignEditorBar } from "@harness-monorepo/ui/blocks/design/design-editor-bar"
import { DesignEditorFrame, usePreviewDevice, useWideEditor } from "@harness-monorepo/ui/blocks/design/design-editor-frame"
import { DesignLeaveDialog } from "@harness-monorepo/ui/blocks/design/design-leave-dialog"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { useStoreColorPresets, useUpdateStoreColors } from "@/services/stores/store-hooks"
import { BandEditor } from "./band-editor"
import { DesignDeleteConfirm, type PendingDelete } from "./design-delete-confirm"
import { DesignInspector } from "./design-inspector"
import { DesignPanel } from "./design-panel"
import { BlockGallery } from "@harness-monorepo/ui/blocks/design/block-gallery"

// App
import { DesignPreviewPane } from "./design-preview-pane"
import { applyComponentOrder, applyOrder, labelOf, orderedIdsOf, takenKindsOf } from "./design-draft"
import { arrangementOf, previewOf, shelvesOf } from "./design-draft-preview"
import { useBlockInsert } from "./use-block-insert"
import { useDesignDraft } from "./use-design-draft"
import { useLeaveGuard } from "./use-leave-guard"
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


/**
 * The full-screen editor: the bar above, and the structure, the shop and the chosen block's fields.
 *
 * The arrangement is a draft until Publish — `useDesignDraft` says why. What a component says, and
 * what colour a band is, save on their own the moment the owner hits save in the sheet: those are
 * things they want to see land, not an order to hold back.
 */
export function DesignScreen({ store, categories, year, messages, web }: DesignScreenProps) {
  const text = messages.design
  const slug = store.slug

  const draft = useDesignDraft(slug)
  const { rows, saved } = draft
  const presets = useStoreColorPresets()
  const saveColors = useUpdateStoreColors(slug)
  const shelves = shelvesOf(store.sections)
  const shop = useShopRefresh()

  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [editingComponent, setEditingComponent] = useState<string | null>(null)
  const [panelTab, setPanelTab] = useState<"blocks" | "colors">("blocks")
  const [device, setDevice] = usePreviewDevice()
  // The side columns' drawers, where the three columns do not fit.
  const [structureOpen, setStructureOpen] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const wide = useWideEditor()
  // Every choice of a block shows its fields — in the right column, or in its drawer on a narrow
  // screen. On a wide one no drawer opens: it would pop up, modal, the moment the window narrowed.
  const choose = (id: string) => {
    setEditingComponent(id)
    if (wide) return
    setStructureOpen(false)
    setInspectorOpen(true)
  }
  const [editingBand, setEditingBand] = useState<string | null>(null)
  // A showcase's products are resolved on the server, so a new or saved one sends the page for them.
  const opened = (component: { id: string; kind: ComponentKind }) => {
    choose(component.id)
    if (component.kind === "PRODUCTS") shop.refresh(component.id)
  }
  const adding = useBlockInsert(slug, rows, saved, opened)

  /*
    The palette is its own draft, and it saves on its own — a colour is the kind of thing you want
    to see land, and `PUT /stores/:slug/colors` exists precisely so a colour save never re-posts
    the whole shop over whatever another screen just wrote.
  */
  const [palette, setPalette] = useState<StoreColors>(store.colors)
  const paletteChanged = COLOUR_KEYS.some((key) => palette[key] !== store.colors[key])

  // What the gallery never offers: the strip a page has once, and what this kind of page cannot hold.
  const unavailableKinds: ComponentKind[] =
    store.type === "INSTITUTIONAL" ? ["PRODUCTS", "CATEGORIES"] : ["CONTACT"]
  const takenKinds = takenKindsOf(rows)
  const bandName = (id: string) =>
    bandLabelOf(saved.find((section) => section.id === id)?.name, rows.findIndex((row) => row.id === id) + 1, messages)

  const editing = saved.flatMap((section) => section.components).find((c) => c.id === editingComponent) ?? null
  const editingSection = saved.find((section) => section.id === editingBand) ?? null
  const guard = useLeaveGuard(draft.changed)

  return (
    <>
      <DesignLeaveDialog open={guard.asking} onStay={guard.stay} onLeave={guard.leave} messages={messages} />

      <DesignDeleteConfirm
        pending={pendingDelete}
        draft={draft}
        onDone={() => setPendingDelete(null)}
        messages={messages}
        web={web}
      />

      <BandEditor
        slug={slug}
        section={editingSection}
        position={rows.findIndex((row) => row.id === editingBand) + 1}
        pageBackground={palette.background}
        onClose={() => setEditingBand(null)}
        messages={messages}
      />

      <DesignEditorFrame
        bar={
          <DesignEditorBar
            backHref={`/admin/${slug}`}
            onBack={guard.onLeave}
            shopName={store.name}
            pageName={text.frame.homePage}
            device={device}
            onDeviceChange={setDevice}
            changes={draft.changeCount}
            publishing={draft.publishing}
            onPublish={draft.publish}
            onDiscard={draft.discard}
            shopHref={`/${slug}`}
            onOpenStructure={() => setStructureOpen(true)}
            onOpenInspector={() => setInspectorOpen(true)}
            linkComponent={AppLink}
            messages={messages}
          />
        }
        structure={
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
            onEdit={choose}
            onInsert={adding.setInsertAt}
            inserting={adding.inserting}
            selectedId={editingComponent}
            tab={panelTab}
            onTabChange={setPanelTab}
            palette={palette}
            onPalette={setPalette}
            presets={presets.data ?? []}
            paletteChanged={paletteChanged}
            savingColours={saveColors.isPending}
            onSaveColours={() => saveColors.mutate(palette)}
            messages={messages}
          />
        }
        preview={
          <DesignPreviewPane
            store={store}
            categories={categories}
            year={year}
            sections={previewOf(rows, saved, shelves)}
            shelves={shelves}
            refreshingId={shop.refreshingId}
            device={device}
            colors={palette}
            orderedIds={orderedIdsOf(rows)}
            onReorder={(ids) => draft.edit(applyOrder(rows, ids))}
            onEdit={choose}
            selectedId={editingComponent}
            messages={messages}
          />
        }
        inspector={
          <DesignInspector
            slug={slug}
            editing={editing}
            saved={saved}
            pageBackground={palette.background}
            categoriesShown={categories.length}
            shelves={shelves}
            onClose={() => {
              setEditingComponent(null)
              setInspectorOpen(false)
            }}
            onSaved={(component) => (component.kind === "PRODUCTS" ? shop.refresh(component.id) : undefined)}
            messages={messages}
            web={web}
          />
        }
        structureOpen={structureOpen}
        onStructureOpenChange={setStructureOpen}
        inspectorOpen={inspectorOpen}
        onInspectorOpenChange={setInspectorOpen}
        // The block's fields close themselves; the hint has nothing to close, so the drawer does.
        inspectorHasOwnClose={editing !== null}
        messages={messages}
      />

      {/*
        The one gallery every "+" opens, already knowing where the block goes. Adding is a saved
        write, not a draft edit — a reload must not lose what the owner watched appear — and the form
        then opens on the block just created, so nothing lands somewhere the owner has to find it.
      */}
      <BlockGallery
        open={adding.insertAt !== null}
        onOpenChange={(open) => (open ? undefined : adding.setInsertAt(null))}
        // The strip is the one kind a page has once; a site has no catalogue, a shop no form leads.
        taken={takenKinds}
        unavailable={unavailableKinds}
        onAdd={adding.insert}
        offerRows={adding.insertAt?.level === "band"}
        messages={messages}
      />
    </>
  )
}
