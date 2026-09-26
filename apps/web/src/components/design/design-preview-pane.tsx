"use client"

// React
import type { ReactNode } from "react"

// Types
import type { PublicProductCategory, PublicSection, PublicStore } from "@harness-monorepo/contracts"

// UI
import type { InsertAt } from "@harness-monorepo/ui/blocks/design/band-arrangement"
import { ArrangeBoard } from "@harness-monorepo/ui/blocks/design/design-arrange"
import { DesignBesideSlot } from "@harness-monorepo/ui/blocks/design/design-beside-slot"
import { bandAnnouncements, bandLabelOf } from "@harness-monorepo/ui/blocks/design/band-label"
import { DesignHandle } from "@harness-monorepo/ui/blocks/design/design-handle"
import { DesignPreview } from "@harness-monorepo/ui/blocks/design/design-preview"
import type { PreviewDevice } from "@harness-monorepo/ui/blocks/design/preview-device-toggle"
import { StorefrontBandCell } from "@harness-monorepo/ui/blocks/storefront/storefront-band-cell"
import { besideOf } from "@harness-monorepo/ui/lib/band-rows"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { StorefrontFrame } from "@/components/storefront/storefront-frame"
import { StorefrontSections } from "@/components/storefront/storefront-sections"
import { storefrontRoutes } from "@/lib/storefront-routes"
import { labelOf } from "./design-draft"
import { InertLink } from "./inert-link"
import type { Shelves } from "./design-draft-preview"
import { DesignPreviewBlock } from "./design-preview-block"

export interface DesignPreviewPaneProps {
  store: PublicStore
  categories: readonly PublicProductCategory[]
  year: number
  /** The draft, already resolved into what the shop window would be served. */
  sections: readonly PublicSection[]
  /** The showcases the shop was served with; one missing is hidden on the server, shown in the draft. */
  shelves: Shelves
  /** The showcase whose products are being fetched again, drawn as its skeleton until they land. */
  refreshingId?: string | null
  /** Chosen in the editor's bar, which owns it now that the bar and not the pane carries the toggle. */
  device: PreviewDevice
  /** The palette being edited, so the preview answers the picker and not the database. */
  colors: PublicStore["colors"]
  /** The bands, in order — what the board over the preview drags. */
  orderedIds: readonly string[]
  onReorder: (ids: string[]) => void
  /** Opens a component's fields. The preview is the second way in; the panel's row is the first. */
  onEdit: (componentId: string) => void
  /** The component whose form is open, drawn as selected here too. */
  selectedId?: string | null
  /** The band chosen on its own — one of several blocks, picked by its header. */
  selectedBandId?: string | null
  /** The selection's actions, drawn over whichever of the two is chosen. */
  selectionBar?: ReactNode
  /** The key the editor's ↑↓ know a block by: its band's when it is alone there. */
  nodeOf?: (componentId: string) => string
  /** The room a row has left, pressed: a block beside the row's last one. Without it none is drawn. */
  onInsert?: (at: InsertAt) => void
  inserting?: boolean
  messages: UiMessages
}

/**
 * The shop, drawn from the draft.
 *
 * It draws through `StorefrontSections` — the same function the shop window calls — which is what
 * makes the preview worth looking at. Two renderers would drift the day someone fixed a spacing
 * bug in one of them, and the owner would be arranging a page that does not exist.
 *
 * **Dragging here moves a band; the pencil on a component opens its fields.** The two levels are
 * not both draggable in the preview: a drag inside a band inside a drag of bands is two gestures
 * on one pointer, and the panel beside it already does the inner one with room to see.
 */
export function DesignPreviewPane({
  store,
  categories,
  year,
  sections,
  shelves,
  refreshingId = null,
  device,
  colors,
  orderedIds,
  onReorder,
  onEdit,
  selectedId = null,
  selectedBandId = null,
  selectionBar,
  nodeOf = (componentId) => componentId,
  onInsert,
  inserting = false,
  messages,
}: DesignPreviewPaneProps) {
  const routes = storefrontRoutes(store)
  const layout = store.layoutSettings

  // The room the band's last row has left, as a cell the size of the block that would land there.
  // Only room there is: splitting a full row evenly is the panel's "Adicionar ao lado". Not on the
  // phone, where every block is a row and the slot would sit under the block, not beside it.
  const besideSlotOf = (section: PublicSection) => {
    // The computer's row: a block kept for the phone takes no room in it.
    const inRow = section.components.filter((component) => component.visibleOn !== "PHONE")
    const last = inRow.at(-1)
    const room = last ? besideOf(inRow.map((component) => component.span), inRow.length - 1) : null
    if (!onInsert || device === "PHONE" || !last || !room || room.rebalance.length) return null
    const at: InsertAt = { level: "beside", sectionId: section.id, afterId: last.id, span: room.span, rebalance: [] }
    return (
      <StorefrontBandCell span={room.span}>
        <DesignBesideSlot name={labelOf(last.kind, last.title, messages)} onAdd={() => onInsert(at)} disabled={inserting} messages={messages} />
      </StorefrontBandCell>
    )
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      {/*
        Nothing in the preview navigates. The inert link component covers what the blocks inject; the
        capture handlers cover the anchors and the one form that bypass it — the WhatsApp button, the
        social icons and the search. Together they also catch a middle click and an Enter in the form.
      */}
      <div
        className="border-shell-border overflow-hidden rounded-xl border"
        onClickCapture={(event) => event.preventDefault()}
        onSubmitCapture={(event) => event.preventDefault()}
      >
        {/*
          The second board, over the same ids as the panel's. Two and not one spanning both: a single
          context would make the shop and the list each other's drop targets, so a band could be
          dragged out of the window and into the panel.
        */}
        <ArrangeBoard
          ids={orderedIds}
          onReorder={onReorder}
          layout="grid"
          // The panel's words for the same bands, rather than dnd-kit's English and a row's id.
          announcements={bandAnnouncements(
            orderedIds.map((id) => ({ id, name: sections.find((section) => section.id === id)?.name ?? null })),
            messages,
          )}
        >
          <DesignPreview device={device}>
            <StorefrontFrame
              store={store}
              colors={colors}
              // The draft's bands, so a site's menu in the preview is the menu being arranged.
              sections={sections}
              categories={categories}
              year={year}
              searchSlot={null}
              linkComponent={InertLink}
              messages={messages}
              blocks={
                <StorefrontSections
                  sections={sections}
                  primary={colors.primary}
                  categories={categories}
                  routes={routes}
                  showPrice={layout.showProductPrice ?? true}
                  showBadge={layout.showProductBadges ?? true}
                  quickAdd={layout.showQuickAdd ?? true}
                  linkComponent={InertLink}
                  renderBandEnd={besideSlotOf}
                  renderSection={(section, band) => (
                    <DesignHandle
                      id={section.id}
                      label={bandLabelOf(section.name, orderedIds.indexOf(section.id) + 1, messages)}
                      selected={section.id === selectedBandId}
                      {...(section.id === selectedBandId && selectionBar ? { bar: selectionBar } : {})}
                      messages={messages}
                    >
                      {band}
                    </DesignHandle>
                  )}
                  renderBlock={(component, block) => (
                    <DesignPreviewBlock
                      component={component}
                      block={block}
                      shelves={shelves}
                      categoriesShown={categories.length}
                      refreshing={component.id === refreshingId}
                      selected={component.id === selectedId}
                      {...(component.id === selectedId && selectionBar ? { bar: selectionBar } : {})}
                      nodeId={nodeOf(component.id)}
                      onEdit={onEdit}
                      messages={messages}
                    />
                  )}
                  messages={messages}
                />
              }
            />
          </DesignPreview>
        </ArrangeBoard>
      </div>
    </div>
  )
}
