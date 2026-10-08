"use client"

// UI
import { StorefrontOfferStrip } from "@harness-monorepo/ui/blocks/storefront/storefront-offer-strip"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { useShopAddress } from "@/components/storefront/shop-address-provider"
import type { OfferStripView } from "@/lib/offer-strip"
import { popupCookieOf, type PopupNotice } from "@/lib/popup-cookie"
import { useOfferStrip } from "@/stores/offer-strip"

export interface StorefrontOfferStripLiveProps {
  slug: string
  strip: OfferStripView
  /** Which of the shop's two notices this strip is: a visitor's invitation, or a customer's first-order benefit. */
  notice: PopupNotice
  /** The revision its closing is remembered at: the pop-up's, 0 at a shop with none on (`offersViewOf`). */
  revision: number
  messages: UiMessages
}

/**
 * The shop's offer strip, with the one thing about it that happens in the browser: closing it.
 * What it says, and that it is here at all, was decided on the server for whoever the page was
 * drawn for.
 *
 * Closed — by its "×", or used: its button followed to the cart or to the sign-up — it is closed
 * for good (BEELINK-311): the browser's `bl_popup` takes the strip's number, and the server leaves
 * the strip out of every page of the shop until the cookie runs out. Copying the code closes
 * nothing: whoever copied it may still want the way to the cart. The store only takes it off this
 * page at the click; what outlives the page is the cookie.
 *
 * It is never on a page with the shop's pop-up (BEELINK-310): the server draws one or the other
 * (`offersViewOf`), so nothing here steps aside and nothing arrives under the pointer when a dialog closes.
 */
export function StorefrontOfferStripLive({ slug, strip, notice, revision, messages }: StorefrontOfferStripLiveProps) {
  const shop = useShopAddress(slug)
  const closed = useOfferStrip((state) => state.closed[slug] === true)
  const close = useOfferStrip((state) => state.close)

  if (closed) return null

  function remember() {
    document.cookie = popupCookieOf(shop, notice, revision, window.location.protocol === "https:", "STRIP")
  }

  return (
    <div data-offer-strip>
      <StorefrontOfferStrip
        message={strip.message}
        detail={strip.detail}
        code={strip.code}
        action={strip.action}
        // The link is followed either way: the strip stays where it is until the next page arrives without it.
        onAction={remember}
        onDismiss={() => {
          remember()
          close(slug)
        }}
        messages={messages}
      />
    </div>
  )
}
