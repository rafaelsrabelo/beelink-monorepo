"use client"

// Types
import type { PublicProductCategory, PublicStore } from "@harness-monorepo/contracts"

// UI
import type { GalleryEntry } from "@harness-monorepo/ui/blocks/design/section-gallery"
import { DesignPreview } from "@harness-monorepo/ui/blocks/design/design-preview"
import { ShopPaletteProvider } from "@harness-monorepo/ui/blocks/storefront/shop-palette-context"
import { StorefrontAnnouncement } from "@harness-monorepo/ui/blocks/storefront/storefront-announcement"
import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"
import { cn } from "@harness-monorepo/ui/lib/utils"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { figtree, shopFontStyle } from "@/components/storefront/shop-font"
import { StorefrontSections } from "@/components/storefront/storefront-sections"
import { storefrontRoutes } from "@/lib/storefront-routes"
import { sampleSectionOf, type GalleryStock } from "./gallery-samples"
import { InertLink } from "./inert-link"

export interface GalleryPreviewProps {
  entry: GalleryEntry
  store: PublicStore
  categories: readonly PublicProductCategory[]
  stock: GalleryStock
  /** The palette being edited, so a card answers the picker and not the database. */
  colors: PublicStore["colors"]
  messages: UiMessages
}

/**
 * A card's picture: the section as the shop would draw it, in the shop's own colours and with its
 * own products, at a computer's width and shrunk to the card — the same renderer as the shop window
 * and the editor's preview, so what is chosen is what arrives. Null where the shop has nothing to
 * fill it with yet: the card keeps its wireframe.
 */
export function GalleryPreview({ entry, store, categories, stock, colors, messages }: GalleryPreviewProps) {
  const section = entry.kind === "ANNOUNCEMENT" ? null : sampleSectionOf(entry, stock, messages)
  if (entry.kind !== "ANNOUNCEMENT" && !section) return null

  return (
    <DesignPreview device="DESKTOP">
      <ShopPaletteProvider colors={colors}>
        {/* The shop's typeface too: the gallery is a portal, outside the editor's font wrapper. */}
        <div
          data-shop-window=""
          style={{ ...shopFontStyle, ...shopPaletteStyle(colors), fontFamily: "var(--font-shop, inherit)" }}
          className={cn(figtree.variable, section && "py-8")}
        >
          {section ? (
            <StorefrontSections
              sections={[section]}
              primary={colors.primary}
              categories={categories}
              routes={storefrontRoutes(store)}
              showPrice={store.layoutSettings.showProductPrice ?? true}
              showBadge={store.layoutSettings.showProductBadges ?? true}
              quickAdd={store.layoutSettings.showQuickAdd ?? true}
              linkComponent={InertLink}
              messages={messages}
            />
          ) : (
            <StorefrontAnnouncement messages={[messages.design.gallery.samples.announcement]} />
          )}
        </div>
      </ShopPaletteProvider>
    </DesignPreview>
  )
}
