"use client"

// UI
import { StorefrontOfferStrip } from "@harness-monorepo/ui/blocks/storefront/storefront-offer-strip"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { OfferStripView } from "@/lib/offer-strip"
import { useOfferStrip } from "@/stores/offer-strip"
import { useShopPopup } from "@/stores/shop-popup"

export interface StorefrontOfferStripLiveProps {
  slug: string
  strip: OfferStripView
  messages: UiMessages
}

/**
 * The shop's offer strip, with the one thing about it that happens in the browser: closing it.
 * What it says was decided on the server, for whoever the page was drawn for; closed, it stays so
 * until the next full load (`stores/offer-strip.ts` says why no longer). The shop window's links
 * are plain anchors, so that is most often the next page: the strip is back there, by design.
 *
 * While the shop's pop-up is open (BEELINK-306) the strip steps aside: the two would say the same
 * thing at the same moment. Hidden and not removed — it keeps its place, so nothing on the page
 * moves when the pop-up opens or closes — and it is back, the calm reminder, once the pop-up is gone.
 */
export function StorefrontOfferStripLive({ slug, strip, messages }: StorefrontOfferStripLiveProps) {
  const closed = useOfferStrip((state) => state.closed[slug] === true)
  const close = useOfferStrip((state) => state.close)
  const popupOpen = useShopPopup((state) => state.open[slug] === true)

  if (closed) return null

  return (
    <div data-offer-strip className={popupOpen ? "invisible" : undefined}>
      <StorefrontOfferStrip message={strip.message} detail={strip.detail} code={strip.code} action={strip.action} onDismiss={() => close(slug)} messages={messages} />
    </div>
  )
}
