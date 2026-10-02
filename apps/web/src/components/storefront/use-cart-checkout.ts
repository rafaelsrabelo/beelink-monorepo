"use client"

// React
import { useMemo, useState } from "react"

// Types
import type { CustomerProfile, PaymentMethod } from "@harness-monorepo/contracts"
import type { StorefrontCheckoutShipping } from "@harness-monorepo/ui/blocks/storefront/storefront-checkout"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"

// App
import { useCartPricing, type CartPricingHandle } from "./use-cart-pricing"
import { useCheckoutChoice, type CheckoutChoiceHandle, type CheckoutWays } from "./use-checkout-choice"
import type { ServedQuote } from "@/lib/cart-pricing"
import type { CartView } from "@/lib/cart-view"
import { checkoutShippingOf } from "@/lib/checkout-shipping"

export interface CartCheckoutInput {
  slug: string
  view: CartView
  shopper: CustomerProfile | null
  paymentMethods: readonly PaymentMethod[]
  deliverTo: string | null
  served: ServedQuote | null
  arrivedWith: string | null
  locale: string
  messages: UiMessages
}

export interface CartCheckoutHandle extends CheckoutChoiceHandle {
  pricing: CartPricingHandle
  /** What the shop's delivery rules quote to the chosen address, in words; null while nobody knows. */
  shipping: StorefrontCheckoutShipping | null
  /** Why no order can go out the way chosen — the shop does not reach the address, or hands nothing over now — in words; null when one can. */
  blocked: string | null
}

/**
 * The cart's way out as one thing (BEELINK-178): how it leaves, what it costs, and what the shop's
 * delivery rules say of the address — which arrive with the price and decide what can be chosen. The
 * ways the shop offers are held from the last price, so the choice keeps to them while the next one
 * is asked.
 */
export function useCartCheckout({ slug, view, shopper, paymentMethods, deliverTo, served, arrivedWith, locale, messages }: CartCheckoutInput): CartCheckoutHandle {
  const text = messages.storefront
  const [ways, setWays] = useState<CheckoutWays | null>(null)
  const { addresses, choice, setChoice } = useCheckoutChoice(shopper, paymentMethods, deliverTo, ways)
  // The address goes with a pick-up too: the delivery beside it says what it would cost.
  const pricing = useCartPricing({ slug, view, fulfillment: choice.fulfillment, addressId: choice.addressId, shopperId: shopper?.id ?? null, served, arrivedWith, locale, messages })
  const shipping = useMemo(() => checkoutShippingOf(pricing.shipping, (cents) => formatCents(cents, locale, "BRL"), locale, text), [pricing.shipping, locale, text])
  // Remembered during the draw itself, as the price's other verdicts are: the next draw already keeps to them.
  if (shipping && (ways?.delivery !== shipping.delivery || ways?.pickup !== shipping.pickup)) setWays({ delivery: shipping.delivery, pickup: shipping.pickup })

  const blocked = shipping && !shipping.delivery && !shipping.pickup ? text.checkoutNoWay : choice.fulfillment === "DELIVERY" && shipping?.unreachable ? shipping.deliveryNote : null
  return { addresses, choice, setChoice, pricing, shipping, blocked }
}
