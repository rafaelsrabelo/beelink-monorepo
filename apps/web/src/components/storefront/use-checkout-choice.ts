"use client"

// React
import { useMemo, useState } from "react"

// Types
import type { CustomerProfile } from "@harness-monorepo/contracts"
import type { StorefrontCheckoutAddress, StorefrontCheckoutChoice } from "@harness-monorepo/ui/blocks/storefront/storefront-checkout"

// App
import { firstFulfillmentOf } from "@/lib/cart-pricing"
import { checkoutAddressesOf } from "@/lib/saved-address"

/** The ways the shop hands an order over, as its delivery rules say (BEELINK-178). */
export interface CheckoutWays {
  delivery: boolean
  pickup: boolean
  /** The ways to deliver to the chosen address, in the order the checkout lists them (BEELINK-186). */
  ids: readonly string[]
}

export interface CheckoutChoiceHandle {
  /** The saved addresses a delivery can go to, the default first; none for a visitor. */
  addresses: StorefrontCheckoutAddress[]
  /** The payment in it is as picked, not yet held to what the shop takes. */
  choice: StorefrontCheckoutChoice
  setChoice: (choice: StorefrontCheckoutChoice) => void
}

/**
 * How the cart's order leaves, as the shopper picked it — held to what the page says now: an address
 * gone since, or a way the shop does not offer, is never what gets sent. The default stands in for
 * an address no longer offered, and the shop's only way of handing the order over is chosen
 * already. `ways` is null until the shop's rules are known: both stand then.
 *
 * How it is paid comes back as it was picked: what the shop takes depends on the cart's total
 * (BEELINK-205), which is priced from this choice, so `useCartCheckout` holds the payment to it.
 */
export function useCheckoutChoice(shopper: CustomerProfile | null, deliverTo: string | null, ways: CheckoutWays | null = null): CheckoutChoiceHandle {
  const addresses = useMemo(() => (shopper ? checkoutAddressesOf(shopper) : []), [shopper])
  const [picked, setChoice] = useState<StorefrontCheckoutChoice>(() => ({
    fulfillment: firstFulfillmentOf(shopper),
    addressId: deliverTo,
    paymentMethod: null,
    wayId: null,
  }))
  const address = addresses.find((each) => each.id === picked.addressId) ?? addresses[0] ?? null
  const delivers = address !== null && ways?.delivery !== false
  const picksUp = ways?.pickup !== false

  return {
    addresses,
    choice: {
      ...picked,
      fulfillment: delivers && (picked.fulfillment === "DELIVERY" || !picksUp) ? "DELIVERY" : "PICKUP",
      addressId: address?.id ?? null,
      // The first way stands until another is picked, and for one the shop no longer offers to this address.
      wayId: ways ? (ways.ids.find((id) => id === picked.wayId) ?? ways.ids[0] ?? null) : null,
    },
    setChoice,
  }
}
