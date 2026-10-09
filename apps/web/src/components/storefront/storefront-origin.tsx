"use client"

// React
import { useEffect, useEffectEvent, useRef } from "react"

// App
import { useConsent } from "./consent-provider"
import { useShopAddress } from "@/components/storefront/shop-address-provider"
import { marketingAllowed } from "@/lib/consent-cookie"
import { arrivalOf, originAfter, originCookieOf, originFromCookies, sameOrigin, withoutClick, type VisitOrigin } from "@/lib/origin-cookie"

export interface StorefrontOriginProps {
  slug: string
  /** The shop's Meta Pixel; null with none — and then no click identifier is ever kept. */
  pixelId: string | null
}

/**
 * Keeps where a visitor came to this shop from (BEELINK-275), in the shop's own `bl_origin`: the
 * campaign of the link they landed by, for the order they may place to record.
 *
 * In the shop's layout, so it sees the address of the landing and of nothing after it: a full page
 * load mounts it, and so does a navigation that enters the shop from elsewhere on the site. A link
 * inside the shop that carries campaign labels of its own is not an arrival and changes nothing.
 * In the browser and not on the server, because Meta's click identifier is kept only with the
 * visitor's yes, and a yes is given on the page: by then the address the server saw is gone.
 *
 * The campaign labels are kept whatever the visitor answered, and at a shop with no pixel too: they
 * describe the campaign, not the person. The click identifier is kept only while
 * `marketingAllowed()` says yes. One that arrived before any answer waits here, in memory and
 * nowhere else, for a yes given before the next page load; a no drops it, and a yes taken back
 * takes it out of the cookie.
 */
export function StorefrontOrigin({ slug, pixelId }: StorefrontOriginProps) {
  const shop = useShopAddress(slug)
  const choice = useConsent((consent) => consent.choice)
  const allowed = marketingAllowed({ metaPixelId: pixelId }, choice)
  /** This page load's arrival at the shop named, as its address told it. */
  const landing = useRef<{ slug: string; arrival: VisitOrigin | null } | null>(null)

  const settle = useEffectEvent(() => {
    const now = Date.now()
    if (landing.current?.slug !== slug) landing.current = { slug, arrival: arrivalOf(window.location.search, now) }
    // A no is an answer about this click too: it does not wait for a change of mind.
    if (choice === "denied") landing.current.arrival = withoutClick(landing.current.arrival)

    const kept = originFromCookies(document.cookie, now)
    const next = originAfter(kept, landing.current.arrival, allowed)
    if (!sameOrigin(kept, next)) document.cookie = originCookieOf(shop, next, now, window.location.protocol === "https:")
  })

  useEffect(() => {
    settle()
  }, [slug, allowed, choice])

  return null
}
