"use client"

// React
import { useEffect, useEffectEvent, useRef } from "react"

// Next
import { useRouter } from "next/navigation"

// App
import { arriveByLink } from "@/lib/affiliate-arrival"
import { AFFILIATE_KEY } from "@/lib/affiliate-cookie"

export interface StorefrontAffiliateArrivalProps {
  slug: string
}

/**
 * Tells the shop that the visitor arrived by an affiliate's link (IMPULSEIA-105): `?afiliado=` on
 * the address a page loaded with, which `/<shop>/<name>` leads to.
 *
 * In the shop's layout, like `StorefrontOrigin`, so it sees the address of the landing and of nothing
 * after it. In the browser and not on the server, because a link's preview fetches the address
 * without running the page, and must count no visit. When the shop kept the affiliate the page is
 * drawn again, so the layout reads the cookie it now holds: the card on this address, the strip on
 * the next. The name stays in the address; reading the page again is not counted twice, which is
 * the shop's handler's to tell (`bl_affiliate` already holding the same affiliate, just now).
 */
export function StorefrontAffiliateArrival({ slug }: StorefrontAffiliateArrivalProps) {
  const router = useRouter()
  /** The address this page already told: an effect run twice is one arrival. */
  const told = useRef<string | null>(null)

  const settle = useEffectEvent(async () => {
    const asked = new URLSearchParams(window.location.search).get(AFFILIATE_KEY)
    if (!asked || told.current === window.location.href) return
    told.current = window.location.href

    if (await arriveByLink(slug, asked)) router.refresh()
  })

  useEffect(() => {
    void settle()
  }, [slug])

  return null
}
