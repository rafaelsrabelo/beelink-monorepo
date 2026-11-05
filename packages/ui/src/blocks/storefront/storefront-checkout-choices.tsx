"use client"

// React
import { useId } from "react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import type { PaymentMethod } from "../store/store-types"
import { StorefrontCheckoutDelivery, type StorefrontCheckoutAddressForm } from "./storefront-checkout-delivery"
import { StorefrontCheckoutPayment, type CheckoutPaymentChannel, type StorefrontCheckoutOnline } from "./storefront-checkout-payment"

export type { CheckoutOnlineMethod, CheckoutPaymentChannel, StorefrontCheckoutOnline } from "./storefront-checkout-payment"
export type { StorefrontCheckoutAddressForm } from "./storefront-checkout-delivery"

/** Mirrors the wire's `OrderFulfillment`; this package imports no contracts. */
export type CheckoutFulfillment = "DELIVERY" | "PICKUP"

export interface StorefrontCheckoutChoice {
  fulfillment: CheckoutFulfillment
  /** The saved address a delivery goes to; null before there is one to go to. */
  addressId: string | null
  /** The way a delivery goes by, among `shipping.ways`; null takes the first of them. */
  wayId: string | null
  /** Null until the shopper picks one — a shop takes several, and none is theirs to assume. */
  paymentMethod: PaymentMethod | null
  /** Where it is paid (BEELINK-205): settled with the shop, or charged online. Absent is `OFFLINE`. */
  paymentChannel?: CheckoutPaymentChannel
  /** The instalments of a card charged online; absent is 1. */
  installments?: number
}

/**
 * What the shop's delivery rules say of the chosen address (BEELINK-178), already in words. Mirrors
 * what the wire's `ShippingQuote` holds; the screen reads it and this block never sees a contract.
 */
export interface StorefrontCheckoutShipping {
  /** The shop delivers at all — itself, or by carrier. Off, there is no delivery to choose. */
  delivery: boolean
  /** The shop hands orders over at its counter. Off, there is no pick-up to choose. */
  pickup: boolean
  /** The ways to get the order to the chosen address (BEELINK-186): the shop's own delivery and each carrier's service. */
  ways: readonly StorefrontCheckoutWay[]
  /**
   * Under the delivery choice. With one way, what it costs and when it arrives; with none, why — the
   * shop does not reach the address; null with several, which are listed to choose among.
   */
  note: string | null
}

/** One way to deliver, as the checkout lists it. */
export interface StorefrontCheckoutWay {
  id: string
  /** "Entrega da loja", "Correios · SEDEX". */
  title: string
  /** "R$ 27,45 · chega em 3–4 dias úteis". */
  detail: string
}

/** A saved address a delivery can go to, as the cart offers it. */
export interface StorefrontCheckoutAddress {
  id: string
  /** "Casa · Rafael Souza"; who receives alone when the address has no name. */
  heading: string
  /** The address in one line. */
  line: string
}

export interface StorefrontCheckoutChoicesProps {
  value: StorefrontCheckoutChoice
  onChange: (value: StorefrontCheckoutChoice) => void
  /** The saved addresses a delivery can go to, the default first; none turns delivery off. */
  addresses: readonly StorefrontCheckoutAddress[]
  /** Where the shopper adds an address, coming back to the cart: what stands without `addressForm`. */
  addHref: string
  /** The address form, opened here in the checkout (a delivery chosen with no address, or another asked for); absent, adding one is `addHref`. */
  addressForm?: StorefrontCheckoutAddressForm | null
  /** The methods the shop settles by on delivery or at pickup, in its own order; none when it turned that off. */
  paymentMethods: readonly PaymentMethod[]
  /** What the shop charges online for this cart (BEELINK-205); null when it charges nothing online. */
  online?: StorefrontCheckoutOnline | null
  /** The order has nothing to pay: said in place of the payment's choices. */
  nothingToPay?: string | null
  /**
   * What the shop's rules quote to the chosen address; null while nobody knows — a visitor, no
   * address, a price still being asked — and both ways are offered with the fee agreed afterwards.
   */
  shipping?: StorefrontCheckoutShipping | null
  /** The CPF of who receives a carrier's delivery, asked when the record has none (BEELINK-187); null asks for none. */
  recipientDocument?: { value: string; onChange: (value: string) => void } | null
  disabled?: boolean
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** A choice drawn as a card around a real radio: the whole card is its label, and it reads as chosen. */
const OPTION =
  "flex min-h-11 cursor-pointer items-start gap-3 rounded-[10px] border border-shop-line px-3 py-2.5 text-sm has-checked:border-shop-primary has-checked:bg-shop-primary-tint has-disabled:cursor-not-allowed has-disabled:opacity-60"
const RADIO = "mt-0.5 size-4 shrink-0 accent-shop-primary"

/**
 * How the order is handed over and how it is paid — what an order cannot be placed without. The
 * delivery is `StorefrontCheckoutDelivery`'s: one of the shopper's saved addresses, or one given
 * right there in the checkout; under it, what the shop's rules quote to it (BEELINK-178) and the
 * ways to get there (BEELINK-186). A way the shop switched off is not offered. How it is paid is
 * `StorefrontCheckoutPayment`'s: the shop's own labels, and what it charges online (BEELINK-205).
 */
export function StorefrontCheckoutChoices({
  value,
  onChange,
  addresses,
  addHref,
  addressForm = null,
  paymentMethods,
  online = null,
  nothingToPay = null,
  shipping = null,
  recipientDocument = null,
  disabled = false,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontCheckoutChoicesProps) {
  const text = messages.storefront
  const id = useId()
  const delivers = shipping?.delivery !== false
  const picksUp = shipping?.pickup !== false

  return (
    <div className="flex flex-col gap-4">
      <fieldset disabled={disabled} className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">{text.checkoutFulfillment}</legend>
        {delivers ? (
          <StorefrontCheckoutDelivery
            value={value}
            onChange={onChange}
            name={`${id}-fulfillment`}
            addresses={addresses}
            addHref={addHref}
            addressForm={addressForm}
            shipping={shipping}
            recipientDocument={recipientDocument}
            linkComponent={Link}
            messages={messages}
          />
        ) : null}
        {picksUp ? (
          <label className={OPTION}>
            <input
              type="radio"
              name={`${id}-fulfillment`}
              className={RADIO}
              checked={value.fulfillment === "PICKUP"}
              onChange={() => onChange({ ...value, fulfillment: "PICKUP" })}
            />
            <span className="font-medium">{text.checkoutPickup}</span>
          </label>
        ) : null}
        {!delivers && !picksUp ? <p role="status" className="text-sm">{text.checkoutNoWay}</p> : null}
      </fieldset>

      <StorefrontCheckoutPayment value={value} onChange={onChange} offlineMethods={paymentMethods} online={online} nothingToPay={nothingToPay} disabled={disabled} messages={messages} />
    </div>
  )
}
