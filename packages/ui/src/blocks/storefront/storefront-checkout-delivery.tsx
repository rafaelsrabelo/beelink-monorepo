"use client"

// React
import { useId, useState, type ReactNode } from "react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import type { StorefrontCheckoutAddress, StorefrontCheckoutChoice, StorefrontCheckoutShipping } from "./storefront-checkout-choices"
import { StorefrontCpfField } from "./storefront-cpf-field"

/** The address form as the checkout opens it. */
export interface StorefrontCheckoutAddressForm {
  /**
   * Drawn by the screen that knows where it posts. `autoFocus` when the shopper's own tap opened it;
   * `onCancel` null when there is no other address to go back to.
   */
  draw: (open: { autoFocus: boolean; onCancel: (() => void) | null }) => ReactNode
  /** Open on arrival: an address refused comes back to its form, with what was wrong. */
  startOpen?: boolean
}

export interface StorefrontCheckoutDeliveryProps {
  value: StorefrontCheckoutChoice
  onChange: (value: StorefrontCheckoutChoice) => void
  /** The radio group the delivery shares with the pick-up beside it. */
  name: string
  addresses: readonly StorefrontCheckoutAddress[]
  /** Where an address is added away from the cart: what stands without `addressForm`. */
  addHref: string
  /** The address form, opened here in the checkout; absent, adding one is a link away. */
  addressForm?: StorefrontCheckoutAddressForm | null
  shipping: StorefrontCheckoutShipping | null
  recipientDocument: { value: string; onChange: (value: string) => void } | null
  linkComponent?: LinkComponent
  messages?: UiMessages
}

const OPTION =
  "flex min-h-11 cursor-pointer items-start gap-3 rounded-[10px] border border-shop-line px-3 py-2.5 text-sm has-checked:border-shop-primary has-checked:bg-shop-primary-tint has-disabled:cursor-not-allowed has-disabled:opacity-60"
const RADIO = "mt-0.5 size-4 shrink-0 accent-shop-primary"
const ADD = "min-h-11 self-start text-xs font-semibold text-shop-primary-ink hover:underline"

/**
 * The delivery among the ways to receive: the address it goes to, what the shop's rules quote there
 * (BEELINK-178), the ways to get there (BEELINK-186) and a carrier's CPF (BEELINK-187).
 *
 * With `addressForm`, the address is given here, in the checkout: a delivery can be chosen before
 * there is any address, and choosing it opens the form; with addresses already, "Entregar em outro
 * endereço" opens it. Without, a delivery waits for an address added a link away, as before.
 */
export function StorefrontCheckoutDelivery({
  value,
  onChange,
  name,
  addresses,
  addHref,
  addressForm = null,
  shipping,
  recipientDocument,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontCheckoutDeliveryProps) {
  const text = messages.storefront
  const id = useId()
  // Opened by a tap — choosing a delivery with no address, or asking for another — and so focused.
  const [adding, setAdding] = useState(addressForm?.startOpen ?? false)
  const [tapped, setTapped] = useState(false)
  const chosen = addresses.find((address) => address.id === value.addressId) ?? addresses[0] ?? null
  const delivering = value.fulfillment === "DELIVERY"
  const ways = shipping?.ways ?? []
  const unreachable = shipping !== null && ways.length === 0
  const way = ways.find((each) => each.id === value.wayId) ?? ways[0] ?? null
  const feeNote = !chosen || unreachable ? null : shipping ? shipping.note : delivering ? text.checkoutFeeLater : null
  const formOpen = addressForm !== null && delivering && (!chosen || adding)

  function chooseDelivery() {
    if (!chosen) setTapped(true)
    onChange({ ...value, fulfillment: "DELIVERY", addressId: chosen?.id ?? null })
  }

  return (
    <>
      <label className={OPTION}>
        <input type="radio" name={name} className={RADIO} checked={delivering} disabled={!chosen && addressForm === null} onChange={chooseDelivery} />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="font-medium">{text.checkoutDelivery}</span>
          <span className="break-words text-xs text-shop-muted">{chosen ? format(text.checkoutDeliverTo, { address: chosen.line }) : text.checkoutNoAddress}</span>
          {feeNote ? <span className="break-words text-xs font-medium">{feeNote}</span> : null}
        </span>
      </label>
      {/* A shop that does not reach the address is news the shopper has to hear, before the addresses to choose another from. */}
      {delivering && chosen && unreachable && shipping?.note ? (
        <p role="status" className="rounded-[10px] border border-shop-line bg-shop-fill px-3 py-2 text-xs font-medium">
          {shipping.note}
        </p>
      ) : null}
      {delivering && addresses.length > 1 ? (
        <fieldset className="ml-7 flex flex-col gap-2">
          <legend className="mb-1 text-xs font-semibold">{text.checkoutAddressChoose}</legend>
          {addresses.map((address) => (
            <label key={address.id} className={OPTION}>
              <input type="radio" name={`${id}-address`} className={RADIO} checked={chosen?.id === address.id} onChange={() => onChange({ ...value, addressId: address.id })} />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-medium break-words">{address.heading}</span>
                <span className="break-words text-xs text-shop-muted">{address.line}</span>
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}
      {formOpen && addressForm ? (
        addressForm.draw({ autoFocus: tapped || (adding && !addressForm.startOpen), onCancel: chosen ? () => setAdding(false) : null })
      ) : chosen && !delivering ? null : addressForm ? (
        chosen ? (
          <button type="button" onClick={() => setAdding(true)} className={ADD}>
            {text.checkoutAddAnotherAddress}
          </button>
        ) : null
      ) : (
        <Link href={addHref} className="self-start text-xs font-semibold text-shop-primary-ink hover:underline">
          {chosen ? text.checkoutAddAnotherAddress : text.checkoutAddAddress}
        </Link>
      )}
      {delivering && chosen && ways.length > 1 ? (
        <fieldset className="ml-7 flex flex-col gap-2">
          <legend className="mb-1 text-xs font-semibold">{text.checkoutWayChoose}</legend>
          {ways.map((each) => (
            <label key={each.id} className={OPTION}>
              <input type="radio" name={`${id}-way`} className={RADIO} checked={way?.id === each.id} onChange={() => onChange({ ...value, wayId: each.id })} />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-medium break-words">{each.title}</span>
                <span className="break-words text-xs text-shop-muted">{each.detail}</span>
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}
      {delivering && chosen && recipientDocument ? (
        <StorefrontCpfField
          label={text.checkoutRecipientDocument}
          hint={text.checkoutRecipientDocumentHint}
          value={recipientDocument.value}
          onChange={recipientDocument.onChange}
          className="ml-7"
          messages={messages}
        />
      ) : null}
    </>
  )
}
