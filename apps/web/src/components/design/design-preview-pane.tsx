"use client"

// React
import type { ComponentProps, ReactNode } from "react"

// Types
import type { Banner, PublicProductCard, PublicProductCategory, PublicStore } from "@harness-monorepo/contracts"

// UI
import { PRODUCTS_ROW_ID } from "@harness-monorepo/ui/blocks/design/banner-arrangement"
import { ArrangeBoard } from "@harness-monorepo/ui/blocks/design/design-arrange"
import { DesignHandle } from "@harness-monorepo/ui/blocks/design/design-handle"
import { DesignPreview } from "@harness-monorepo/ui/blocks/design/design-preview"
import { StorefrontProductRail } from "@harness-monorepo/ui/blocks/storefront/storefront-product-rail"
import { StorefrontShowcase } from "@harness-monorepo/ui/blocks/storefront/storefront-showcase"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { StorefrontFrame } from "@/components/storefront/storefront-frame"
import { storefrontRoutes } from "@/lib/storefront-routes"
import type { Draft } from "./design-draft"

export interface DesignPreviewPaneProps {
  store: PublicStore
  categories: readonly PublicProductCategory[]
  products: readonly PublicProductCard[]
  year: number
  /** The draft, already split on the products row. */
  above: readonly Draft[]
  below: readonly Draft[]
  /** The saved banners, for the fields the arrangement does not hold — subtitle and target. */
  saved: readonly Banner[]
  orderedIds: readonly string[]
  onReorder: (ids: string[]) => void
  messages: UiMessages
}

/** An anchor with no `href` navigates nowhere and takes no tab stop. */
function InertLink({ href: _href, ...props }: ComponentProps<"a"> & { href: string }) {
  return <a {...props} />
}

/**
 * The shop, drawn from the draft, with every block in it draggable where it stands.
 *
 * It is a pane and not the screen: the screen owns the unsent edit and the writing of it, and this
 * owns only how the shop is drawn from what the screen is holding. That split is what keeps either
 * one under the line limit, and it is why every callback here goes back out rather than reaching
 * for a mutation.
 */
export function DesignPreviewPane({
  store,
  categories,
  products,
  year,
  above,
  below,
  saved,
  orderedIds,
  onReorder,
  messages,
}: DesignPreviewPaneProps) {
  const text = messages.design
  const routes = storefrontRoutes(store)
  const byId = new Map(saved.map((banner) => [banner.id, banner]))

  /**
   * The address of a poster, rebuilt here.
   *
   * A second implementation of what the API does in `banners.mapper.ts`, on purpose: the preview
   * draws the *draft*, which the server has not seen, so there is no answer to read a resolved
   * href out of. It goes through `storefrontRoutes` — the one module in this app allowed to spell
   * a storefront segment — so the two cannot disagree about the shape of an address, only ever
   * about a slug that changed between them.
   */
  function hrefOf(banner: Banner): string | undefined {
    if (banner.target === "CATEGORY" && banner.categorySlug) return routes.category(banner.categorySlug)
    if (banner.target === "PRODUCT" && banner.productSlug) return routes.product(banner.productSlug)
    if (banner.target === "EXTERNAL" && banner.externalUrl) return banner.externalUrl

    return undefined
  }

  function showcasesOf(side: readonly Draft[]) {
    return side
      .filter((row) => row.isActive)
      .map((row) => {
        const banner = byId.get(row.id)

        return {
          id: row.id,
          title: row.title,
          subtitle: banner?.subtitle ?? null,
          imageUrl: row.imageUrl,
          layout: row.layout,
          ...(banner ? { href: hrefOf(banner), external: banner.target === "EXTERNAL" } : {}),
        }
      })
  }

  /** A poster in the preview, with a grip over its corner. */
  function draggable(item: { id: string; title: string }, card: ReactNode) {
    return (
      <DesignHandle id={item.id} label={item.title} messages={messages}>
        {card}
      </DesignHandle>
    )
  }

  return (
    /*
      Nothing in the preview navigates. The inert link component covers what the blocks inject; the
      capture handlers cover the three anchors and the one form that bypass it — the WhatsApp
      button, the social icons and the search. Together they also catch a middle click and an Enter
      inside the form.
    */
    <div
      className="border-shell-border min-w-0 flex-1 overflow-hidden rounded-xl border"
      onClickCapture={(event) => event.preventDefault()}
      onSubmitCapture={(event) => event.preventDefault()}
    >
      {/*
        The second board, over the same ids as the sidebar's. Two and not one spanning both: a
        single context would make the shop and the list each other's drop targets, so a poster
        could be dragged out of the window and into the panel.
      */}
      <ArrangeBoard ids={orderedIds} onReorder={onReorder} layout="grid">
        <DesignPreview>
          <StorefrontFrame
            store={store}
            categories={categories}
            year={year}
            showBanner
            showHighlights
            searchSlot={null}
            linkComponent={InertLink}
            messages={messages}
          >
            <StorefrontShowcase
              items={showcasesOf(above)}
              linkComponent={InertLink}
              renderItem={draggable}
            />
            {/* The bands are dragged here too, which is how a poster crosses to the other side. */}
            <DesignHandle id={PRODUCTS_ROW_ID} label={text.productList} messages={messages}>
              <StorefrontProductRail
                products={products}
                productHref={routes.product}
                title={messages.storefront.catalogTitle}
                seeAllHref={routes.catalog()}
                locale="pt-BR"
                linkComponent={InertLink}
                messages={messages}
              />
            </DesignHandle>
            <StorefrontShowcase
              items={showcasesOf(below)}
              linkComponent={InertLink}
              renderItem={draggable}
            />
          </StorefrontFrame>
        </DesignPreview>
      </ArrangeBoard>
    </div>
  )
}
