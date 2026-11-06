"use client"

// React
import { useId } from "react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import type { StorefrontCheckoutAddress, StorefrontCheckoutChoice, StorefrontCheckoutShipping } from "./storefront-checkout-choices"
import { StorefrontCheckoutDelivery, type StorefrontCheckoutAddressForm } from "./storefront-checkout-delivery"

export interface StorefrontCheckoutFulfillmentProps {
  value: StorefrontCheckoutChoice
  onChange: (value: StorefrontCheckoutChoice) => void
  addresses: readonly StorefrontCheckoutAddress[]
  addHref: string
  addressForm?: StorefrontCheckoutAddressForm | null
  shipping?: StorefrontCheckoutShipping | null
  recipientDocument?: { value: string; onChange: (value: string) => void } | null
  disabled?: boolean
  linkComponent?: LinkComponent
  messages?: UiMessages
}

const OPTION =
  "flex min-h-11 cursor-pointer items-start gap-3 rounded-[10px] border border-shop-line px-3 py-2.5 text-sm has-checked:border-shop-primary has-checked:bg-shop-primary-tint has-disabled:cursor-not-allowed has-disabled:opacity-60"
const RADIO = "mt-0.5 size-4 shrink-0 accent-shop-primary"

/**
 * How the order is handed over: the delivery (`StorefrontCheckoutDelivery` — the address, what the
 * shop's rules quote to it, the ways to get there) and the pick-up, each offered while the shop
 * offers it, and why neither when it offers none. The checkout's second step.
 */
export function StorefrontCheckoutFulfillment({
  value,
  onChange,
  addresses,
  addHref,
  addressForm = null,
  shipping = null,
  recipientDocument = null,
  disabled = false,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontCheckoutFulfillmentProps) {
  const text = messages.storefront
  const id = useId()
  const delivers = shipping?.delivery !== false
  const picksUp = shipping?.pickup !== false

  return (
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
          <input type="radio" name={`${id}-fulfillment`} className={RADIO} checked={value.fulfillment === "PICKUP"} onChange={() => onChange({ ...value, fulfillment: "PICKUP" })} />
          <span className="font-medium">{text.checkoutPickup}</span>
        </label>
      ) : null}
      {!delivers && !picksUp ? <p role="status" className="text-sm">{text.checkoutNoWay}</p> : null}
    </fieldset>
  )
}
