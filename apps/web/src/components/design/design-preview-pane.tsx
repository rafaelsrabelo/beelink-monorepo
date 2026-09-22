"use client"

// React
import type { ComponentProps, ReactNode } from "react"

// Types
import type { PublicProductCategory, PublicSection, PublicStore } from "@harness-monorepo/contracts"

// UI
import { ArrangeBoard } from "@harness-monorepo/ui/blocks/design/design-arrange"
import { DesignHandle } from "@harness-monorepo/ui/blocks/design/design-handle"
import { DesignPreview } from "@harness-monorepo/ui/blocks/design/design-preview"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { HomeBand } from "@/lib/storefront-data"
import { StorefrontFrame } from "@/components/storefront/storefront-frame"
import { StorefrontSections } from "@/components/storefront/storefront-sections"
import { storefrontRoutes } from "@/lib/storefront-routes"
import { labelOf } from "./design-draft"

export interface DesignPreviewPaneProps {
  store: PublicStore
  categories: readonly PublicProductCategory[]
  bands: readonly HomeBand[]
  year: number
  /** The draft, already resolved into what the shop window would be served. */
  sections: readonly PublicSection[]
  orderedIds: readonly string[]
  onReorder: (ids: string[]) => void
  messages: UiMessages
}

/** An anchor with no `href` navigates nowhere and takes no tab stop. */
function InertLink({ href: _href, ...props }: ComponentProps<"a"> & { href: string }) {
  return <a {...props} />
}

/**
 * The shop, drawn from the draft, with every block draggable where it stands.
 *
 * It draws through `StorefrontSections` — the same function the shop window calls — which is what
 * makes the preview worth looking at. Two renderers would drift the day someone fixed a spacing
 * bug in one of them, and the owner would be arranging a page that does not exist.
 */
export function DesignPreviewPane({
  store,
  categories,
  bands,
  year,
  sections,
  orderedIds,
  onReorder,
  messages,
}: DesignPreviewPaneProps) {
  const routes = storefrontRoutes(store)
  const layout = store.layoutSettings

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
        The second board, over the same ids as the sidebar's. Two and not one spanning both: a
        single context would make the shop and the list each other's drop targets, so a block could
        be dragged out of the window and into the panel.
      */}
      <ArrangeBoard ids={orderedIds} onReorder={onReorder} layout="grid">
        <DesignPreview>
          <StorefrontFrame
            store={store}
            categories={categories}
            year={year}
            searchSlot={null}
            linkComponent={InertLink}
            messages={messages}
            blocks={
              <StorefrontSections
                sections={sections}
                bands={bands}
                routes={routes}
                showPrice={layout.showProductPrice ?? true}
                showBadge={layout.showProductBadges ?? true}
                linkComponent={InertLink}
                renderBlock={(section, block) => (
                  <DesignHandle
                    id={section.id}
                    label={labelOf(section.kind, section.title, messages)}
                    messages={messages}
                  >
                    {block}
                  </DesignHandle>
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
