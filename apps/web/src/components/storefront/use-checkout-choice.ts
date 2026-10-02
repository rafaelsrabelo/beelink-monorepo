"use client"

// React
import { useMemo, useState } from "react"

// Types
import type { CustomerProfile, PaymentMethod } from "@harness-monorepo/contracts"
import type { StorefrontCheckoutAddress, StorefrontCheckoutChoice } from "@harness-monorepo/ui/blocks/storefront/storefront-checkout"

// App
import { firstFulfillmentOf } from "@/lib/cart-pricing"
import { checkoutAddressesOf } from "@/lib/saved-address"

/** The ways the shop hands an order over, as its delivery rules say (BEELINK-178). */
export interface CheckoutWays {
  delivery: boolean
  pickup: boolean
}

export interface CheckoutChoiceHandle {
  /** The saved addresses a delivery can go to, the default first; none for a visitor. */
  addresses: StorefrontCheckoutAddress[]
  choice: StorefrontCheckoutChoice
  setChoice: (choice: StorefrontCheckoutChoice) => void
}

/**
 * How the cart's order leaves and is paid, as the shopper picked it — held to what the page says
 * now: an address gone since, a payment the shop stopped taking, or a way the shop does not offer
 * is never what gets sent. The default stands in for an address no longer offered, a shop's only
 * payment is chosen already, and so is its only way of handing the order over. `ways` is null until
 * the shop's rules are known: both stand then.
 */
export function useCheckoutChoice(shopper: CustomerProfile | null, paymentMethods: readonly PaymentMethod[], deliverTo: string | null, ways: CheckoutWays | null = null): CheckoutChoiceHandle {
  const addresses = useMemo(() => (shopper ? checkoutAddressesOf(shopper) : []), [shopper])
  const [picked, setChoice] = useState<StorefrontCheckoutChoice>(() => ({
    fulfillment: firstFulfillmentOf(shopper),
    addressId: deliverTo,
    paymentMethod: paymentMethods.length === 1 ? paymentMethods[0]! : null,
  }))
  const address = addresses.find((each) => each.id === picked.addressId) ?? addresses[0] ?? null
  const delivers = address !== null && ways?.delivery !== false
  const picksUp = ways?.pickup !== false

  return {
    addresses,
    choice: {
      fulfillment: delivers && (picked.fulfillment === "DELIVERY" || !picksUp) ? "DELIVERY" : "PICKUP",
      addressId: address?.id ?? null,
      paymentMethod:
        picked.paymentMethod && paymentMethods.includes(picked.paymentMethod)
          ? picked.paymentMethod
          : paymentMethods.length === 1
            ? paymentMethods[0]!
            : null,
    },
    setChoice,
  }
}
