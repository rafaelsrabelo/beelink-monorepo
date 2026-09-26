"use client"

// Types
import type { PublicProductCategory, PublicStore } from "@harness-monorepo/contracts"

// UI
import type { GalleryEntry } from "@harness-monorepo/ui/blocks/design/section-gallery"
import { DesignPreview } from "@harness-monorepo/ui/blocks/design/design-preview"
import { ShopPaletteProvider } from "@harness-monorepo/ui/blocks/storefront/shop-palette-context"
import { StorefrontAnnouncement } from "@harness-monorepo/ui/blocks/storefront/storefront-announcement"
import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
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
        <div data-shop-window="" style={shopPaletteStyle(colors)} className={section ? "py-8" : undefined}>
          {section ? (
            <StorefrontSections
              sections={[section]}
              primary={colors.primary}
              categories={categories}
              routes={storefrontRoutes(store)}
              showPrice={store.layoutSettings.showProductPrice ?? true}
              showBadge={store.layoutSettings.showProductBadges ?? true}
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
