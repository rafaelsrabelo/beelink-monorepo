"use client"

// React
import { useEffect, useEffectEvent } from "react"

// Next
import { useRouter } from "next/navigation"

// App
import { arriveByLink } from "@/lib/affiliate-arrival"
import { AFFILIATE_KEY } from "@/lib/affiliate-cookie"
import { useAffiliateReferralUi } from "@/stores/affiliate-referral"

export interface StorefrontAffiliateArrivalProps {
  slug: string
}

/**
 * Tells the shop that the visitor arrived by an affiliate's link (IMPULSEIA-105): `?afiliado=` on
 * the address a page loaded with, which `/<shop>/<name>` leads to.
 *
 * In the shop's layout, like `StorefrontOrigin`, so it sees the address of the landing and of nothing
 * after it. In the browser and not on the server, because a link's preview fetches the address
 * without running the page, and must count no visit. The name leaves the address at once — a page
 * read again is not a second visit, and a link copied onward does not carry it — and, when the shop
 * kept the affiliate, the page is drawn again: the server now reads the cookie, and the card is
 * drawn where the link arrived.
 */
export function StorefrontAffiliateArrival({ slug }: StorefrontAffiliateArrivalProps) {
  const router = useRouter()
  const arrive = useAffiliateReferralUi((state) => state.arrive)

  const settle = useEffectEvent(async () => {
    const url = new URL(window.location.href)
    const asked = url.searchParams.get(AFFILIATE_KEY)
    if (!asked) return

    url.searchParams.delete(AFFILIATE_KEY)
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`)
    if (!(await arriveByLink(slug, asked))) return

    arrive(slug, url.pathname)
    router.refresh()
  })

  useEffect(() => {
    void settle()
  }, [slug])

  return null
}
