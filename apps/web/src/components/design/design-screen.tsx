"use client"

// React
import { useState } from "react"

// Types
import type { ComponentKind, PublicProductCategory, PublicStore, StoreColors } from "@harness-monorepo/contracts"

// UI
import { bandLabelOf } from "@harness-monorepo/ui/blocks/design/band-label"
import { DesignEditorBar } from "@harness-monorepo/ui/blocks/design/design-editor-bar"
import { DesignEditorFrame, usePreviewDevice } from "@harness-monorepo/ui/blocks/design/design-editor-frame"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { useStoreColorPresets, useUpdateStoreColors } from "@/services/stores/store-hooks"
import type { PendingDelete } from "./design-delete-confirm"
import { DesignInspector } from "./design-inspector"
import { DesignPanel } from "./design-panel"
import { DesignScreenDialogs } from "./design-screen-dialogs"
import { LivePreviewPane } from "./live-preview-pane"
import { applyComponentOrder, applyOrder, labelOf, orderedIdsOf, takenKindsOf } from "./design-draft"
import { arrangementOf, shelvesOf } from "./design-draft-preview"
import { editedOf } from "./design-selection"
import { useBlockInsert } from "./use-block-insert"
import { useDesignDraft } from "./use-design-draft"
import { useDesignSelection } from "./use-design-selection"
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
 * The full-screen editor: the bar above, and the structure, the shop and the chosen block's panel.
 *
 * The arrangement is a draft until Publish — `useDesignDraft` says why — and so is how each block
 * sits. What a component says, and what a band looks like, save on their own the moment the owner
 * hits Salvar in the panel: those are things they want to see land, not an order to hold back.
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
  const [panelTab, setPanelTab] = useState<"blocks" | "colors">("blocks")
  const [device, setDevice] = usePreviewDevice()
  const selection = useDesignSelection(rows)
  const { choose, target, editingBand } = selection
  const edited = editedOf(target)
  const chooseBlock = (id: string) => choose({ level: "block", id })
  // A showcase's products are resolved on the server, so a new or saved one sends the page for them.
  const opened = (component: { id: string; kind: ComponentKind }) => {
    chooseBlock(component.id)
    if (component.kind === "PRODUCTS") shop.refresh(component.id)
  }
  const adding = useBlockInsert(slug, draft, opened, web)

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

  const editingSection = saved.find((section) => section.id === editingBand) ?? null
  const guard = useLeaveGuard(draft.changed)

  return (
    <>
      <DesignScreenDialogs
        slug={slug}
        guard={guard}
        draft={draft}
        pendingDelete={pendingDelete}
        onDeleteDone={() => setPendingDelete(null)}
        editingSection={editingSection}
        editingPosition={rows.findIndex((row) => row.id === editingBand) + 1}
        pageBackground={palette.background}
        onBandClose={() => selection.setEditingBand(null)}
        adding={adding}
        takenKinds={takenKinds}
        unavailableKinds={unavailableKinds}
        messages={messages}
        web={web}
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
            onOpenStructure={() => selection.setStructureOpen(true)}
            onOpenInspector={() => selection.setInspectorOpen(true)}
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
            onEditBand={selection.setEditingBand}
            onDeleteBand={(id) => setPendingDelete({ level: "band", id, name: bandName(id) })}
            onToggle={(id, isActive) => draft.patchComponent(id, { isActive })}
            onSpanChange={(id, span) => draft.patchComponent(id, { span })}
            onDelete={(id) => {
              const component = saved.flatMap((section) => section.components).find((c) => c.id === id)
              if (component) {
                setPendingDelete({ level: "component", id, name: labelOf(component.kind, component.title, messages) })
              }
            }}
            onEdit={chooseBlock}
            {...adding.panel}
            selectedId={edited?.componentId ?? null}
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
          <LivePreviewPane
            store={store}
            categories={categories}
            year={year}
            rows={rows}
            saved={saved}
            editing={edited}
            shelves={shelves}
            refreshingId={shop.refreshingId}
            device={device}
            colors={palette}
            orderedIds={orderedIdsOf(rows)}
            onReorder={(ids) => draft.edit(applyOrder(rows, ids))}
            {...adding.preview}
            onEdit={chooseBlock}
            selectedId={edited?.componentId ?? null}
            messages={messages}
          />
        }
        inspector={
          <DesignInspector
            slug={slug}
            target={target}
            rows={rows}
            saved={saved}
            tab={selection.tab}
            onTabChange={selection.setTab}
            onLayoutChange={(id, patch) => draft.patchComponent(id, patch)}
            pageBackground={palette.background}
            categoriesShown={categories.length}
            shelves={shelves}
            onClose={selection.close}
            onSaved={(component) => (component.kind === "PRODUCTS" ? shop.refresh(component.id) : undefined)}
            messages={messages}
            web={web}
          />
        }
        structureOpen={selection.structureOpen}
        onStructureOpenChange={selection.setStructureOpen}
        inspectorOpen={selection.inspectorOpen}
        onInspectorOpenChange={selection.setInspectorOpen}
        // The block's fields close themselves; the hint has nothing to close, so the drawer does.
        inspectorHasOwnClose={target !== null}
        messages={messages}
      />
    </>
  )
}
