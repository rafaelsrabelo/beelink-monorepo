"use client"

// React
import { useMemo, useState } from "react"

// Types
import type { CustomerProfile, PaymentMethod } from "@harness-monorepo/contracts"
import type { StorefrontCheckoutAddress, StorefrontCheckoutChoice } from "@harness-monorepo/ui/blocks/storefront/storefront-checkout"

// App
import { firstFulfillmentOf } from "@/lib/cart-pricing"
import { checkoutAddressesOf } from "@/lib/saved-address"

export interface CheckoutChoiceHandle {
  /** The saved addresses a delivery can go to, the default first; none for a visitor. */
  addresses: StorefrontCheckoutAddress[]
  choice: StorefrontCheckoutChoice
  setChoice: (choice: StorefrontCheckoutChoice) => void
}

/**
 * How the cart's order leaves and is paid, as the shopper picked it — held to what the page says
 * now: an address gone since, or a payment the shop stopped taking, is never what gets sent. The
 * default stands in for an address no longer offered, and a shop's only payment is chosen already.
 */
export function useCheckoutChoice(shopper: CustomerProfile | null, paymentMethods: readonly PaymentMethod[], deliverTo: string | null): CheckoutChoiceHandle {
  const addresses = useMemo(() => (shopper ? checkoutAddressesOf(shopper) : []), [shopper])
  const [picked, setChoice] = useState<StorefrontCheckoutChoice>(() => ({
    fulfillment: firstFulfillmentOf(shopper),
    addressId: deliverTo,
    paymentMethod: paymentMethods.length === 1 ? paymentMethods[0]! : null,
  }))
  const address = addresses.find((each) => each.id === picked.addressId) ?? addresses[0] ?? null

  return {
    addresses,
    choice: {
      fulfillment: address ? picked.fulfillment : "PICKUP",
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
