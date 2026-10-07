"use client"

// React
import { useContext, useEffect, useEffectEvent } from "react"

// App
import { TrackingContext } from "./use-track"
import type { Purchase } from "@/lib/purchase"
import { purchasesCookieOf, purchasesFromCookies, rememberPurchase, wasPurchaseTold } from "@/lib/purchase-cookie"

/**
 * Tells an order's purchase, once for good in this browser (BEELINK-273). It is told while its
 * buyer is looking at the order — the cart's "sent" screen, the payment screen, the order's page —
 * with their yes standing; a yes given on one of those screens tells it then, as it tells where
 * the visitor is.
 *
 * What was told is read from the shop's cookie at the telling, never kept from the mount: that is
 * what a second tab finds. And it is written only when the event really left, so a visitor who has
 * not said yes is marked as nothing.
 */
export function usePurchaseTold(slug: string, purchase: Purchase | null): void {
  const tracking = useContext(TrackingContext)
  const allowed = tracking?.allowed ?? false
  const orderId = purchase?.orderId ?? null
  const tell = useEffectEvent(() => {
    if (!purchase || !tracking) return

    const told = purchasesFromCookies(document.cookie)
    if (wasPurchaseTold(told, purchase.orderId)) return
    if (!tracking.track(purchase.event, { id: purchase.eventId })) return

    document.cookie = purchasesCookieOf(slug, rememberPurchase(told, purchase.orderId), window.location.protocol === "https:")
  })

  useEffect(() => {
    if (allowed && orderId !== null) tell()
  }, [allowed, orderId])
}
