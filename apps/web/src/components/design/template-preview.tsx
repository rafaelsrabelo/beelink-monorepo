"use client"

// Types
import type { PublicProductCategory, PublicStore, StorePage } from "@harness-monorepo/contracts"

// UI
import { useRoomyEditor } from "@harness-monorepo/ui/blocks/design/design-editor-frame"
import { DesignPreview } from "@harness-monorepo/ui/blocks/design/design-preview"
import { TemplatePreviewFrame, type TemplatePreviewSize } from "@harness-monorepo/ui/blocks/design/template-preview-frame"
import { ShopPaletteProvider } from "@harness-monorepo/ui/blocks/storefront/shop-palette-context"
import { StorefrontDeliverTo } from "@harness-monorepo/ui/blocks/storefront/storefront-deliver-to"
import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"
import { cn } from "@harness-monorepo/ui/lib/utils"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { figtree, shopFontStyle } from "@/components/storefront/shop-font"
import { StorefrontFrame } from "@/components/storefront/storefront-frame"
import { StorefrontSections } from "@/components/storefront/storefront-sections"
import { storefrontRoutes } from "@/lib/storefront-routes"
import type { WebMessages } from "@/locales"
import { useTemplatePreview } from "@/services/page/page-template-hooks"
import { InertLink } from "./inert-link"
import { pageErrorCopy } from "./page-error-copy"
import { canAsk, previewStateOf, type OfferedTemplate } from "./template-offer"

export interface TemplatePreviewProps {
  template: OfferedTemplate
  size: TemplatePreviewSize
  /** The page the model would be applied to. */
  page: StorePage
  /** The product the gallery's product models are drawn around, once chosen. */
  productId: string | null
  store: PublicStore
  categories: readonly PublicProductCategory[]
  /** The palette being edited, so a model answers the picker and not the database. */
  colors: PublicStore["colors"]
  year: number
  messages: UiMessages
  web: WebMessages
}

/**
 * One model as it would look on this page of this shop: asked of the API, which builds it from the
 * shop's products, and drawn by the shop's own renderer — so what is chosen is what would arrive.
 *
 * Mounted by a card only once the card is on screen, which is what holds the request back. The card
 * and the whole page share one request (the same key): the card draws the bands alone, at a
 * computer's width and shrunk; the page draws the shop's header and footer around them when the
 * page has them, at a phone's width where the gallery has no room for more.
 */
export function TemplatePreview({ template, size, page, productId, store, categories, colors, year, messages, web }: TemplatePreviewProps) {
  const roomy = useRoomyEditor()
  const request = useTemplatePreview({
    slug: store.slug,
    pageId: page.id,
    templateId: template.id,
    productId: template.needsProduct ? productId : null,
    enabled: canAsk(template, productId),
  })
  const state = previewStateOf(template, productId, request)

  if (state !== "ready" || !request.data) {
    return (
      <TemplatePreviewFrame
        state={state === "ready" ? "loading" : state}
        size={size}
        error={state === "failed" ? (pageErrorCopy(request.error, web) ?? null) : null}
        onRetry={() => void request.refetch()}
        messages={messages}
      />
    )
  }

  const { sections } = request.data
  const routes = storefrontRoutes(store)
  const layout = store.layoutSettings
  const landing = page.kind === "LANDING"
  const bands = (
    <StorefrontSections
      sections={sections}
      primary={colors.primary}
      categories={categories}
      routes={routes}
      showPrice={layout.showProductPrice ?? true}
      showBadge={layout.showProductBadges ?? true}
      showRating={layout.showProductRating ?? true}
      quickAdd={layout.showQuickAdd ?? true}
      cartReachable={!landing || page.usesChrome}
      linkComponent={InertLink}
      messages={messages}
    />
  )

  return (
    <TemplatePreviewFrame state="ready" size={size} messages={messages}>
      <DesignPreview device={size === "large" && !roomy ? "PHONE" : "DESKTOP"}>
        {size === "card" ? (
          <ShopPaletteProvider colors={colors}>
            {/* The shop's typeface too: the gallery is a portal, outside the editor's font wrapper. */}
            <div data-shop-window="" style={{ ...shopFontStyle, ...shopPaletteStyle(colors), fontFamily: "var(--font-shop, inherit)" }} className={cn(figtree.variable, "pb-8")}>
              {bands}
            </div>
          </ShopPaletteProvider>
        ) : (
          <StorefrontFrame
            store={store}
            colors={colors}
            // The strip and a site's menu are the home's: on the home, the previewed bands; on a landing, the home as served.
            sections={landing ? store.sections : sections}
            chrome={!landing || page.usesChrome}
            {...(landing ? { anchorBase: routes.home } : {})}
            categories={categories}
            year={year}
            searchSlot={null}
            deliverToSlot={<StorefrontDeliverTo cep={null} messages={messages} />}
            linkComponent={InertLink}
            messages={messages}
            blocks={bands}
          />
        )}
      </DesignPreview>
    </TemplatePreviewFrame>
  )
}
