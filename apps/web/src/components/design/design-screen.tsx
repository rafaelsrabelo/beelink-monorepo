"use client"

// React
import { useState } from "react"

// Types
import type { ComponentKind, PagePreview, PublicProductCategory, PublicStore, StoreColors } from "@harness-monorepo/contracts"

// UI
import { bandLabelOf } from "@harness-monorepo/ui/blocks/design/band-label"
import { DesignEditorFrame, usePreviewDevice } from "@harness-monorepo/ui/blocks/design/design-editor-frame"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { useStoreColorPresets, useUpdateStoreColors } from "@/services/stores/store-hooks"
import type { PendingDelete } from "./design-delete-confirm"
import { DesignInspector } from "./design-inspector"
import { DesignPagesTab } from "./design-pages-tab"
import { DesignPanel, type DesignPanelTab } from "./design-panel"
import { DesignScreenBar } from "./design-screen-bar"
import { DesignScreenDialogs } from "./design-screen-dialogs"
import { LivePreviewPane } from "./live-preview-pane"
import { applyComponentOrder, applyOrder, labelOf, orderedIdsOf, takenKindsOf } from "./design-draft"
import { arrangementOf, shelvesOf } from "./design-draft-preview"
import { editedOf } from "./design-selection"
import { revealInPreview } from "./design-focus"
import { useBlockInsert } from "./use-block-insert"
import { useDesignDraft } from "./use-design-draft"
import { useDesignSelection } from "./use-design-selection"
import { useLeaveGuard } from "./use-leave-guard"
import { useSelectionControls } from "./use-selection-controls"
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
  /** The landing being edited and its bands as a visitor would be served them. Absent on the home. */
  page?: PagePreview | null
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
export function DesignScreen({ store, categories, page = null, year, messages, web }: DesignScreenProps) {
  const slug = store.slug
  const landing = page?.page ?? null
  const pageId = landing?.id

  const draft = useDesignDraft(slug, pageId)
  const { rows, saved } = draft
  const presets = useStoreColorPresets()
  const saveColors = useUpdateStoreColors(slug)
  const shelves = shelvesOf(page?.sections ?? store.sections)
  const shop = useShopRefresh()

  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [panelTab, setPanelTab] = useState<DesignPanelTab>("blocks")
  const [device, setDevice] = usePreviewDevice()
  const selection = useDesignSelection(rows)
  const { choose, target } = selection
  const edited = editedOf(target)
  const chooseBlock = (id: string) => choose({ level: "block", id })
  // A showcase's products are resolved on the server, so a new or saved one sends the page for them.
  // A new section is chosen, its Conteúdo open, and the preview brought to it: the API may have put
  // it far down the page. By its band's key too, the one a block alone in its band is drawn under.
  const opened = (component: { id: string; kind: ComponentKind; sectionId: string }) => {
    chooseBlock(component.id)
    if (component.kind === "PRODUCTS") shop.refresh(component.id)
    revealInPreview([component.id, component.sectionId])
  }
  const adding = useBlockInsert(slug, pageId, draft, opened, web)

  /*
    The palette is its own draft, and it saves on its own — a colour is the kind of thing you want
    to see land, and `PUT /stores/:slug/colors` exists precisely so a colour save never re-posts
    the whole shop over whatever another screen just wrote.
  */
  const [palette, setPalette] = useState<StoreColors>(store.colors)
  const paletteChanged = COLOUR_KEYS.some((key) => palette[key] !== store.colors[key])

  // What the gallery never offers: the strip a page has once, what this kind of shop cannot hold,
  // and on a landing the strip at all — it is the home's, drawn on every page that uses the header.
  const unavailableKinds: ComponentKind[] = [
    ...(store.type === "INSTITUTIONAL" ? (["PRODUCTS", "CATEGORIES"] as const) : (["CONTACT"] as const)),
    ...(landing ? (["ANNOUNCEMENT"] as const) : []),
  ]
  const takenKinds = takenKindsOf(rows)
  const bandName = (id: string) =>
    bandLabelOf(saved.find((section) => section.id === id)?.name, rows.findIndex((row) => row.id === id) + 1, messages)

  const guard = useLeaveGuard(draft.changed)
  const bands = arrangementOf(rows, saved, shelves, categories.length, !landing)
  const bandAlone = target?.level === "band" && !target.blockId ? target.id : null
  const controls = useSelectionControls({
    slug,
    rows,
    saved,
    bands,
    target,
    draft,
    choose,
    onLayoutTab: () => selection.setTab("layout"),
    onDelete: setPendingDelete,
    bandName,
    messages,
    web,
  })

  return (
    <>
      <DesignScreenDialogs
        guard={guard}
        draft={draft}
        pendingDelete={pendingDelete}
        onDeleteDone={() => setPendingDelete(null)}
        adding={adding}
        takenKinds={takenKinds}
        unavailableKinds={unavailableKinds}
        shelves={shelves}
        gallery={{ store, categories, colors: palette }}
        {...(pageId ? { pageId } : {})}
        messages={messages}
        web={web}
      />

      <DesignEditorFrame
        bar={
          <DesignScreenBar
            slug={slug}
            shopName={store.name}
            page={landing}
            draft={draft}
            onLeave={guard.onLeave}
            device={device}
            onDeviceChange={setDevice}
            onOpenStructure={() => selection.setStructureOpen(true)}
            onOpenInspector={() => selection.setInspectorOpen(true)}
            messages={messages}
          />
        }
        structure={
          <DesignPanel
            bands={bands}
            loading={draft.loading}
            onReorder={(ids) => draft.edit(applyOrder(rows, ids))}
            onReorderComponents={(sectionId, ids) => draft.edit(applyComponentOrder(rows, sectionId, ids))}
            onToggleBand={(id, isActive) => draft.patchSection(id, { isActive })}
            onEditBand={(id) => choose({ level: "band", id })}
            onDeleteBand={(id) => setPendingDelete({ level: "band", id, name: bandName(id) })}
            onToggle={(id, isActive) => draft.patchComponent(id, { isActive })}
            onDelete={(id) => {
              const component = saved.flatMap((section) => section.components).find((c) => c.id === id)
              if (component) {
                setPendingDelete({ level: "component", id, name: labelOf(component.kind, component.title, messages) })
              }
            }}
            onEdit={chooseBlock}
            {...adding.panel}
            selectedId={edited?.componentId ?? null}
            selectedBandId={bandAlone}
            tab={panelTab}
            onTabChange={setPanelTab}
            palette={palette}
            onPalette={setPalette}
            presets={presets.data ?? []}
            paletteChanged={paletteChanged}
            savingColours={saveColors.isPending}
            onSaveColours={() => saveColors.mutate(palette)}
            pages={<DesignPagesTab slug={slug} currentId={pageId ?? null} onNavigate={guard.onLeave} messages={messages} web={web} />}
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
            selectedBandId={bandAlone}
            selectionBar={controls.bar}
            {...(landing ? { landing: { homeSections: store.sections, usesChrome: landing.usesChrome } } : {})}
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
            takeFocus={selection.takeFocus}
            onSaved={(component) => (component.kind === "PRODUCTS" ? shop.refresh(component.id) : undefined)}
            messages={messages}
            web={web}
          />
        }
        structureOpen={selection.structureOpen}
        onStructureOpenChange={selection.setStructureOpen}
        inspectorOpen={selection.inspectorOpen}
        onInspectorOpenChange={selection.setInspectorOpen}
        // The panel closes itself; the hint has nothing to close, so the drawer does.
        inspectorHasOwnClose={target !== null}
        onKeyDown={controls.onKeyDown}
        status={controls.status}
        messages={messages}
      />
    </>
  )
}
