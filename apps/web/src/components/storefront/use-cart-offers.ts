"use client"

// React
import { useMemo } from "react"

// Types
import type { OfferedCoupon, OrderFulfillment, OrderShippingChoice } from "@harness-monorepo/contracts"

// App
import { QUANTITY_DEBOUNCE_MS } from "./use-cart-pricing"
import { offersCartOf, type ServedOffers } from "@/lib/cart-offers"
import { cartQuoteOf } from "@/lib/cart-pricing"
import type { CartView } from "@/lib/cart-view"
import { useDebouncedValue } from "@/services/addresses/use-debounced-value"
import { useCustomerOffers } from "@/services/storefront/storefront-hooks"

export interface CartOffersInput {
  slug: string
  /** Who is asking: null is a visitor, who is told of no code and is not asked for. */
  shopperId: string | null
  view: CartView
  fulfillment: OrderFulfillment
  addressId: string | null
  shipping: OrderShippingChoice | null
  /** What the page was served with; null when the server could not ask. */
  served: ServedOffers | null
}

/**
 * The shop's shown coupons the cart on screen may take (`CustomerOffers.coupons`), following the
 * cart as it changes. The question is the cart's own price's, without a code: the same lines, the
 * same way out, the same address — settled by the same pause, so a run of presses on "+" is one
 * question here as it is there. The API answers it with the reading that takes or refuses a code,
 * which is what keeps "Aplicar" from ever being offered on a coupon it would refuse.
 */
export function useCartOffers({ slug, shopperId, view, fulfillment, addressId, shipping, served }: CartOffersInput): OfferedCoupon[] {
  const rows = useDebouncedValue(view.rows, QUANTITY_DEBOUNCE_MS)
  const cart = useMemo(() => offersCartOf(cartQuoteOf(rows, fulfillment, null, { addressId, shipping })), [rows, fulfillment, addressId, shipping])

  return useCustomerOffers(slug, shopperId, cart, served).data?.coupons ?? []
}
