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
  /**
   * The affiliate the page's own address names — `/<shop>/<name>`, the shop's front door drawn at an
   * affiliate's link. Absent, the address's `?afiliado=` is read instead.
   */
  name?: string
}

/**
 * Tells the shop that the visitor arrived by an affiliate's link (IMPULSEIA-105): `/<shop>/<name>`,
 * whose page hands the name over, or `?afiliado=` on the address any page loaded with.
 *
 * The shop's layout holds one, like `StorefrontOrigin`, so it sees the address of the landing and of
 * nothing after it; the front door drawn at a link's address holds the other, with the name. In the browser and not on the server, because a link's preview fetches the address
 * without running the page, and must count no visit. When the shop kept the affiliate the page is
 * drawn again, so the layout reads the cookie it now holds: the card on this address, the strip on
 * the next. The name stays in the address; reading the page again is not counted twice, which is
 * the shop's handler's to tell (`bl_affiliate` already holding the same affiliate, just now).
 */
export function StorefrontAffiliateArrival({ slug, name }: StorefrontAffiliateArrivalProps) {
  const router = useRouter()
  /** The address this page already told: an effect run twice is one arrival. */
  const told = useRef<string | null>(null)

  const settle = useEffectEvent(async () => {
    const asked = name ?? new URLSearchParams(window.location.search).get(AFFILIATE_KEY)
    if (!asked || told.current === window.location.href) return
    told.current = window.location.href

    if (await arriveByLink(slug, asked)) router.refresh()
  })

  useEffect(() => {
    void settle()
  }, [slug, name])

  return null
}
