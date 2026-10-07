"use client"

// React
import { useMemo, useState } from "react"

// Types
import type { CustomerProfile, OfferedCoupon, PaymentMethod, PlaceCustomerOrderPayload, StorefrontPaymentOptions } from "@harness-monorepo/contracts"
import type { StorefrontCheckoutOnline, StorefrontCheckoutShipping } from "@harness-monorepo/ui/blocks/storefront/storefront-checkout"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"

// App
import { useCartOffers } from "./use-cart-offers"
import { useCartPricing, type CartPricingHandle } from "./use-cart-pricing"
import { useCheckoutChoice, type CheckoutChoiceHandle, type CheckoutWays } from "./use-checkout-choice"
import type { ServedOffers } from "@/lib/cart-offers"
import type { ServedQuote } from "@/lib/cart-pricing"
import type { CartView } from "@/lib/cart-view"
import { checkoutPaymentOf, heldPaymentOf, paymentPayloadOf } from "@/lib/checkout-payment"
import { checkoutShippingOf, shippingChoiceOf } from "@/lib/checkout-shipping"

export interface CartCheckoutInput {
  slug: string
  view: CartView
  shopper: CustomerProfile | null
  paymentMethods: readonly PaymentMethod[]
  /** What the shop charges online, and whether paying on delivery stands (BEELINK-205). */
  paymentOptions: StorefrontPaymentOptions
  deliverTo: string | null
  served: ServedQuote | null
  /** The shopper's offers for this cart as the page was served with them; null and the browser asks. */
  servedOffers?: ServedOffers | null
  arrivedWith: string | null
  locale: string
  messages: UiMessages
}

export interface CartCheckoutHandle extends CheckoutChoiceHandle {
  pricing: CartPricingHandle
  /** The shop's shown coupons this cart may take, as the API lists them; none for a visitor. */
  offers: OfferedCoupon[]
  /** What the shop's delivery rules quote to the chosen address, in words; null while nobody knows. */
  shipping: StorefrontCheckoutShipping | null
  /** Why no order can go out the way chosen — the shop does not reach the address, or hands nothing over now — in words; null when one can. */
  blocked: string | null
  /** How the order leaves, as it is sent: the address and the carrier of a delivery, the fee the summary shows for it, and the CPF typed for a carrier or for paying online. */
  sent: Pick<PlaceCustomerOrderPayload, "addressId" | "shipping" | "deliveryFeeCents" | "recipientDocument">
  /** The CPF of who receives a carrier's delivery, asked while the shopper's record has none (BEELINK-187); null asks for none. */
  recipientDocument: { value: string; onChange: (value: string) => void } | null
  /** The shop's own labels the checkout offers; none when the shop turned paying on delivery off. */
  offlineMethods: readonly PaymentMethod[]
  /** What the shop charges online for this cart, with the payer's CPF when it is to be asked there; null when it charges nothing online. */
  online: StorefrontCheckoutOnline | null
  /** The order has nothing to pay, in words; null when it has. */
  nothingToPay: string | null
  /** How the payment goes with the order; null until a way is chosen. */
  payment: Pick<PlaceCustomerOrderPayload, "paymentMethod" | "paymentChannel" | "installments"> | null
}

/**
 * The cart's way out as one thing (BEELINK-178): how it leaves, what it costs, and what the shop's
 * delivery rules say of the address — which arrive with the price and decide what can be chosen. The
 * ways the shop offers are held from the last price, so the choice keeps to them while the next one
 * is asked; a carrier picked among them (BEELINK-186) goes back into the question, and the price
 * that answers it carries that carrier's fee.
 *
 * How it is paid (BEELINK-205) is held to the price too: the online ways need a total over Asaas's
 * least, a card splits only as far as the total holds, and an order with nothing to pay asks nothing.
 * The CPF is one field for its two reasons — a carrier's label and an online payment — shown where
 * the first of them is.
 */
export function useCartCheckout({ slug, view, shopper, paymentMethods, paymentOptions, deliverTo, served, servedOffers = null, arrivedWith, locale, messages }: CartCheckoutInput): CartCheckoutHandle {
  const text = messages.storefront
  const [ways, setWays] = useState<CheckoutWays | null>(null)
  const [cpf, setCpf] = useState("")
  const { addresses, choice: picked, setChoice } = useCheckoutChoice(shopper, deliverTo, ways)
  const delivering = picked.fulfillment === "DELIVERY"
  const carrier = useMemo(() => (delivering ? shippingChoiceOf(picked.wayId) : null), [delivering, picked.wayId])
  // The address goes with a pick-up too: the delivery beside it says what it would cost.
  const pricing = useCartPricing({ slug, view, fulfillment: picked.fulfillment, addressId: picked.addressId, shipping: carrier, shopperId: shopper?.id ?? null, served, arrivedWith, locale, messages })
  // Asked about the same cart the price is: its lines, how it leaves, where to and by which carrier.
  const offers = useCartOffers({ slug, shopperId: shopper?.id ?? null, view, fulfillment: picked.fulfillment, addressId: picked.addressId, shipping: carrier, served: servedOffers })
  const shipping = useMemo(() => checkoutShippingOf(pricing.shipping, (cents) => formatCents(cents, locale, "BRL"), locale, text), [pricing.shipping, locale, text])
  // Remembered during the draw itself, as the price's other verdicts are: the next draw already keeps to them.
  const ids = shipping?.ways.map((way) => way.id) ?? []
  if (shipping && (ways?.delivery !== shipping.delivery || ways?.pickup !== shipping.pickup || ways.ids.join() !== ids.join())) setWays({ delivery: shipping.delivery, pickup: shipping.pickup, ids })

  // A delivery whose fee is to be agreed leaves the total open: it is what the API will not charge yet.
  const closed = !(delivering && pricing.deliveryFeeCents === null)
  const plan = useMemo(
    () => checkoutPaymentOf(paymentOptions, paymentMethods, { cents: pricing.totalCents, closed }, { money: (cents) => formatCents(cents, locale, "BRL"), text }),
    [paymentOptions, paymentMethods, pricing.totalCents, closed, locale, text],
  )
  const held = heldPaymentOf(picked, plan)
  const paysOnline = held.paymentChannel === "ONLINE" && held.paymentMethod !== null

  // A carrier's label is bought with the CPF of who receives it, and Asaas charges a person by theirs: asked here while the record has none, checked for its length.
  const askCpf = (carrier !== null || paysOnline) && shopper !== null && !shopper.cpf
  const cpfField = askCpf ? { value: cpf, onChange: setCpf } : null
  const cpfDigits = cpf.replace(/\D/g, "")
  const blocked =
    shipping && !shipping.delivery && !shipping.pickup
      ? text.checkoutNoWay
      : delivering && shipping && shipping.ways.length === 0
        ? shipping.note
        : plan.offlineMethods.length === 0 && plan.online?.unavailable
          ? plan.online.unavailable
          : askCpf && cpfDigits.length !== 11
            ? carrier
              ? text.checkoutRecipientDocumentIssue
              : text.checkoutPayerDocumentIssue
            : null
  const sent = {
    ...(delivering
      ? {
          ...(picked.addressId ? { addressId: picked.addressId } : {}),
          ...(carrier ? { shipping: carrier } : {}),
          ...(pricing.deliveryFeeCents !== undefined ? { deliveryFeeCents: pricing.deliveryFeeCents } : {}),
        }
      : {}),
    ...(askCpf ? { recipientDocument: cpfDigits } : {}),
  }
  return {
    addresses,
    choice: { ...picked, ...held },
    setChoice,
    pricing,
    offers,
    shipping,
    blocked,
    sent,
    recipientDocument: carrier ? cpfField : null,
    offlineMethods: plan.offlineMethods,
    online: plan.online ? { ...plan.online, document: carrier ? null : cpfField } : null,
    nothingToPay: plan.nothingToPay,
    payment: paymentPayloadOf(held, plan, paymentMethods),
  }
}
