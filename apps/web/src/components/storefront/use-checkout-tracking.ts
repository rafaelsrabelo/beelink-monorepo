"use client"

// React
import { useMemo, useRef } from "react"

// App
import { useTrack, useTrackView } from "./tracking/use-track"
import type { CartView } from "@/lib/cart-view"
import type { EventItem } from "@/lib/storefront-event"

export interface CheckoutTracking {
  /** The visitor picked how to pay. */
  paymentPicked: () => void
}

/**
 * The checkout's two moments, told once each per visit to the page (BEELINK-272). The cart page is
 * the checkout here — who orders, where it goes, how it is paid and the button are all on it — so
 * arriving with something that can be ordered is the checkout begun; a quantity changed afterwards
 * is the same checkout. The first way of paying the visitor picks is the payment told; changing it
 * is not a second one, and which way it was is not said.
 *
 * The value is the goods that can be ordered now, at the catalogue's price: the coupon, the credit
 * and the delivery are still being chosen on this page, and the closed total is the purchase's.
 */
export function useCheckoutTracking(view: CartView): CheckoutTracking {
  const track = useTrack()
  const paid = useRef(false)
  const cart = useMemo(() => {
    const items = view.rows.filter((row) => row.available && row.qty > 0).map((row): EventItem => ({ productId: row.productId, unitPriceCents: row.unitPriceCents, qty: row.qty }))

    return view.count > 0 ? { items, valueCents: view.subtotalCents } : null
  }, [view])

  useTrackView(cart ? { name: "InitiateCheckout", ...cart } : null, "checkout")

  return {
    paymentPicked: () => {
      if (paid.current || !cart) return
      paid.current = true
      track({ name: "AddPaymentInfo", ...cart })
    },
  }
}
