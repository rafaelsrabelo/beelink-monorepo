"use client"

// React
import type { ComponentProps } from "react"

// Types
import type { PublicProductCategory, PublicSection, PublicStore } from "@harness-monorepo/contracts"

// UI
import { ArrangeBoard } from "@harness-monorepo/ui/blocks/design/design-arrange"
import { DesignEditTag } from "@harness-monorepo/ui/blocks/design/design-edit-tag"
import { DesignHandle } from "@harness-monorepo/ui/blocks/design/design-handle"
import { DesignPreview } from "@harness-monorepo/ui/blocks/design/design-preview"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { HomeBand } from "@/lib/storefront-data"
import { StorefrontFrame } from "@/components/storefront/storefront-frame"
import { StorefrontSections, announcementOf } from "@/components/storefront/storefront-sections"
import { storefrontRoutes } from "@/lib/storefront-routes"
import { labelOf } from "./design-draft"

export interface DesignPreviewPaneProps {
  store: PublicStore
  categories: readonly PublicProductCategory[]
  bands: readonly HomeBand[]
  year: number
  /** The draft, already resolved into what the shop window would be served. */
  sections: readonly PublicSection[]
  /** The palette being edited, so the preview answers the picker and not the database. */
  colors: PublicStore["colors"]
  /** The bands, in order — what the board over the preview drags. */
  orderedIds: readonly string[]
  onReorder: (ids: string[]) => void
  /** Opens a component's fields. The preview is the second way in; the panel's row is the first. */
  onEdit: (componentId: string) => void
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
  bands,
  year,
  sections,
  colors,
  orderedIds,
  onReorder,
  onEdit,
  messages,
}: DesignPreviewPaneProps) {
  const routes = storefrontRoutes(store)
  const layout = store.layoutSettings
  const text = messages.design

  return (
    /*
      Nothing in the preview navigates. The inert link component covers what the blocks inject; the
      capture handlers cover the anchors and the one form that bypass it — the WhatsApp button, the
      social icons and the search. Together they also catch a middle click and an Enter in the form.
    */
    <div
      className="border-shell-border min-w-0 flex-1 overflow-hidden rounded-xl border"
      onClickCapture={(event) => event.preventDefault()}
      onSubmitCapture={(event) => event.preventDefault()}
    >
      {/*
        The second board, over the same ids as the panel's. Two and not one spanning both: a single
        context would make the shop and the list each other's drop targets, so a band could be
        dragged out of the window and into the panel.
      */}
      <ArrangeBoard ids={orderedIds} onReorder={onReorder} layout="grid">
        <DesignPreview>
          <StorefrontFrame
            store={store}
            colors={colors}
            {...(announcementOf(sections) ? { announcement: announcementOf(sections)! } : {})}
            categories={categories}
            year={year}
            searchSlot={null}
            linkComponent={InertLink}
            messages={messages}
            blocks={
              <StorefrontSections
                sections={sections}
                primary={colors.primary}
                bands={bands}
                categories={categories}
                routes={routes}
                showPrice={layout.showProductPrice ?? true}
                showBadge={layout.showProductBadges ?? true}
                linkComponent={InertLink}
                renderSection={(section, band) => (
                  <DesignHandle
                    id={section.id}
                    label={format(text.bandNumber, {
                      position: String(orderedIds.indexOf(section.id) + 1),
                    })}
                    messages={messages}
                  >
                    {band}
                  </DesignHandle>
                )}
                renderBlock={(component, block) => (
                  <DesignEditTag
                    label={labelOf(component.kind, component.title, messages)}
                    onEdit={() => onEdit(component.id)}
                    messages={messages}
                  >
                    {block}
                  </DesignEditTag>
                )}
                messages={messages}
              />
            }
          />
        </DesignPreview>
      </ArrangeBoard>
    </div>
  )
}
