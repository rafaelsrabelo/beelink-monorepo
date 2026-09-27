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
  /** Null until the shopper picks one — a shop takes several, and none is theirs to assume. */
  paymentMethod: PaymentMethod | null
}

export interface StorefrontCheckoutChoicesProps {
  value: StorefrontCheckoutChoice
  onChange: (value: StorefrontCheckoutChoice) => void
  /** Where a delivery goes, the shopper's address on file in one line; null: nowhere, so delivery is off. */
  deliveryLine: string | null
  /** Where the shopper adds an address, coming back to the cart. */
  editHref: string
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
 * delivery goes to the address the shop keeps, shown here; with none, it is off and says where to
 * add one. Nothing is charged here: the payment is a label the shop and the shopper settle by.
 */
export function StorefrontCheckoutChoices({
  value,
  onChange,
  deliveryLine,
  editHref,
  paymentMethods,
  disabled = false,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontCheckoutChoicesProps) {
  const text = messages.storefront
  const id = useId()

  return (
    <div className="flex flex-col gap-4">
      <fieldset disabled={disabled} className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">{text.checkoutFulfillment}</legend>
        <label className={OPTION}>
          <input
            type="radio"
            name={`${id}-fulfillment`}
            className={RADIO}
            checked={value.fulfillment === "DELIVERY"}
            disabled={!deliveryLine}
            onChange={() => onChange({ ...value, fulfillment: "DELIVERY" })}
          />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="font-medium">{text.checkoutDelivery}</span>
            <span className="break-words text-xs text-shop-muted">
              {deliveryLine ? format(text.checkoutDeliverTo, { address: deliveryLine }) : text.checkoutNoAddress}
            </span>
          </span>
        </label>
        {deliveryLine ? null : (
          <Link href={editHref} className="self-start text-xs font-semibold text-shop-primary-ink hover:underline">
            {text.checkoutEdit}
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
