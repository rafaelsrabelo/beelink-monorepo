"use client"

// React
import { useId } from "react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import type { PaymentMethod } from "../store/store-types"

/** Mirrors the wire's `OrderFulfillment`; this package imports no contracts. */
export type CheckoutFulfillment = "DELIVERY" | "PICKUP"

export interface StorefrontCheckoutChoice {
  fulfillment: CheckoutFulfillment
  /** The saved address a delivery goes to; null before there is one to go to. */
  addressId: string | null
  /** Null until the shopper picks one — a shop takes several, and none is theirs to assume. */
  paymentMethod: PaymentMethod | null
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
  /** Where the shopper adds an address, coming back to the cart. */
  addHref: string
  /** The methods the shop takes, in its own order. */
  paymentMethods: readonly PaymentMethod[]
  disabled?: boolean
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** A choice drawn as a card around a real radio: the whole card is its label, and it reads as chosen. */
const OPTION =
  "flex min-h-11 cursor-pointer items-start gap-3 rounded-[10px] border border-shop-line px-3 py-2.5 text-sm has-checked:border-shop-primary has-checked:bg-shop-primary-tint has-disabled:cursor-not-allowed has-disabled:opacity-60"
const RADIO = "mt-0.5 size-4 shrink-0 accent-shop-primary"

/**
 * How the order is handed over and how it is paid — what an order cannot be placed without. A
 * delivery goes to one of the shopper's saved addresses, chosen here when there are several; with
 * none, it is off and says where to add one. Nothing is charged here: the payment is a label the
 * shop and the shopper settle by.
 */
export function StorefrontCheckoutChoices({
  value,
  onChange,
  addresses,
  addHref,
  paymentMethods,
  disabled = false,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontCheckoutChoicesProps) {
  const text = messages.storefront
  const id = useId()
  const chosen = addresses.find((address) => address.id === value.addressId) ?? addresses[0] ?? null
  const delivering = value.fulfillment === "DELIVERY"

  return (
    <div className="flex flex-col gap-4">
      <fieldset disabled={disabled} className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">{text.checkoutFulfillment}</legend>
        <label className={OPTION}>
          <input
            type="radio"
            name={`${id}-fulfillment`}
            className={RADIO}
            checked={delivering}
            disabled={!chosen}
            onChange={() => onChange({ ...value, fulfillment: "DELIVERY", addressId: chosen?.id ?? null })}
          />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="font-medium">{text.checkoutDelivery}</span>
            <span className="break-words text-xs text-shop-muted">
              {chosen ? format(text.checkoutDeliverTo, { address: chosen.line }) : text.checkoutNoAddress}
            </span>
          </span>
        </label>
        {delivering && addresses.length > 1 ? (
          <fieldset className="ml-7 flex flex-col gap-2">
            <legend className="mb-1 text-xs font-semibold">{text.checkoutAddressChoose}</legend>
            {addresses.map((address) => (
              <label key={address.id} className={OPTION}>
                <input
                  type="radio"
                  name={`${id}-address`}
                  className={RADIO}
                  checked={chosen?.id === address.id}
                  onChange={() => onChange({ ...value, addressId: address.id })}
                />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium break-words">{address.heading}</span>
                  <span className="break-words text-xs text-shop-muted">{address.line}</span>
                </span>
              </label>
            ))}
          </fieldset>
        ) : null}
        {chosen && !delivering ? null : (
          <Link href={addHref} className="self-start text-xs font-semibold text-shop-primary-ink hover:underline">
            {chosen ? text.checkoutAddAnotherAddress : text.checkoutAddAddress}
          </Link>
        )}
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
        {value.fulfillment === "DELIVERY" ? <p className="text-xs text-shop-muted">{text.checkoutFeeLater}</p> : null}
      </fieldset>

      <fieldset disabled={disabled} className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">{text.checkoutPayment}</legend>
        <div className="grid grid-cols-2 gap-2">
          {paymentMethods.map((method) => (
            <label key={method} className={OPTION}>
              <input
                type="radio"
                name={`${id}-payment`}
                className={RADIO}
                checked={value.paymentMethod === method}
                onChange={() => onChange({ ...value, paymentMethod: method })}
              />
              <span className="font-medium">{messages.orders.payments[method]}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  )
}
