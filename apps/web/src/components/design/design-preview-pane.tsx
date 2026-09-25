"use client"

// React
import { useState, type ComponentProps } from "react"

// Types
import type { PublicProductCategory, PublicSection, PublicStore } from "@harness-monorepo/contracts"

// UI
import { ArrangeBoard } from "@harness-monorepo/ui/blocks/design/design-arrange"
import { DesignBlockPlaceholder } from "@harness-monorepo/ui/blocks/design/design-block-placeholder"
import { DesignEditTag } from "@harness-monorepo/ui/blocks/design/design-edit-tag"
import { bandAnnouncements, bandLabelOf } from "@harness-monorepo/ui/blocks/design/band-label"
import { DesignHandle } from "@harness-monorepo/ui/blocks/design/design-handle"
import { DesignPreview } from "@harness-monorepo/ui/blocks/design/design-preview"
import { PreviewDeviceToggle, type PreviewDevice } from "@harness-monorepo/ui/blocks/design/preview-device-toggle"
import { StorefrontShelfSkeleton } from "@harness-monorepo/ui/blocks/storefront/storefront-shelf-skeleton"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { StorefrontFrame } from "@/components/storefront/storefront-frame"
import { StorefrontSections } from "@/components/storefront/storefront-sections"
import { storefrontRoutes } from "@/lib/storefront-routes"
import { isEmptyComponent, labelOf } from "./design-draft"
import type { Shelves } from "./design-draft-preview"

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
  /** The palette being edited, so the preview answers the picker and not the database. */
  colors: PublicStore["colors"]
  /** The bands, in order — what the board over the preview drags. */
  orderedIds: readonly string[]
  onReorder: (ids: string[]) => void
  /** Opens a component's fields. The preview is the second way in; the panel's row is the first. */
  onEdit: (componentId: string) => void
  /** The component whose form is open, drawn as selected here too. */
  selectedId?: string | null
  messages: UiMessages
}

/**
 * An anchor with no `href` navigates nowhere and takes no tab stop.
 *
 * The address is overridden after the spread rather than destructured away: React drops an
 * attribute set to `undefined`, and this form leaves no variable that exists only to be ignored.
 */
function InertLink(props: ComponentProps<"a"> & { href: string }) {
  return <a {...props} href={undefined} />
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
  colors,
  orderedIds,
  onReorder,
  onEdit,
  selectedId = null,
  messages,
}: DesignPreviewPaneProps) {
  const routes = storefrontRoutes(store)
  const layout = store.layoutSettings
  const text = messages.design
  // A phone first, because that is where the shop sells. Held here and nowhere else: the pane is not
  // remounted when a sheet opens, and a reload starting over at the phone is what was asked for.
  const [device, setDevice] = useState<PreviewDevice>("PHONE")

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      {/* Outside the pane below, whose capture handlers swallow every click inside it. */}
      <div className="flex justify-end">
        <PreviewDeviceToggle value={device} onChange={setDevice} messages={messages} />
      </div>
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
                  renderSection={(section, band) => (
                    <DesignHandle
                      id={section.id}
                      label={bandLabelOf(section.name, orderedIds.indexOf(section.id) + 1, messages)}
                      messages={messages}
                    >
                      {band}
                    </DesignHandle>
                  )}
                  renderBlock={(component, block) => {
                    const label = labelOf(component.kind, component.title ?? component.sourceCategory?.name ?? null, messages)
                    const unserved = component.kind === "PRODUCTS" && !shelves.has(component.id)
                    // No category on the shop window: the block would say the visitor's sentence here.
                    const noCategories = component.kind === "CATEGORIES" && categories.length === 0
                    // The one rule the renderer already answers, asked here so the page can hold a
                    // place for a block the shop window would draw nothing for.
                    const empty =
                      noCategories ||
                      isEmptyComponent(component.kind, component.title, component.body, component.items)

                    return (
                      <DesignEditTag
                        label={label}
                        selected={component.id === selectedId}
                        onEdit={() => onEdit(component.id)}
                        messages={messages}
                      >
                        {component.id === refreshingId ? (
                          <StorefrontShelfSkeleton
                            display={component.display === "GRID" ? "GRID" : "RAIL"}
                            messages={messages}
                          />
                        ) : empty ? (
                          <DesignBlockPlaceholder
                            kind={component.kind}
                            label={label}
                            {...(unserved ? { action: text.showcaseOnPublish } : {})}
                            {...(noCategories ? { action: text.categoriesHiddenAction } : {})}
                            messages={messages}
                          />
                        ) : (
                          block
                        )}
                      </DesignEditTag>
                    )
                  }}
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
