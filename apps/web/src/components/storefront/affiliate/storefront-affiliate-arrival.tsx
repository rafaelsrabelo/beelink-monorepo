"use client"

// React
import { useEffect, useEffectEvent, useRef } from "react"

// App
import { arriveByLink } from "@/lib/affiliate-arrival"

export interface StorefrontAffiliateArrivalProps {
  slug: string
  /** The affiliate whose sub-site the page is under, as the shop keeps the name. */
  name: string
}

/**
 * Tells the shop that a visitor is on an affiliate's sub-site (IMPULSEIA-105, the user's call of
 * 12/11), so the visit is counted. In the browser and not on the server, because a link's preview
 * fetches the address without running the page, and must count no visit. Every page of the sub-site
 * tells it; the shop's handler counts it once a browser session (`bl_affiliate` already holding the
 * same affiliate). What the page shows does not wait on it: the band and the order's credit come
 * from the address.
 */
export function StorefrontAffiliateArrival({ slug, name }: StorefrontAffiliateArrivalProps) {
  /** The address this page already told: an effect run twice is one arrival. */
  const told = useRef<string | null>(null)

  const settle = useEffectEvent(async () => {
    if (told.current === window.location.href) return
    told.current = window.location.href
    await arriveByLink(slug, name)
  })

  useEffect(() => {
    void settle()
  }, [slug, name])

  return null
}
