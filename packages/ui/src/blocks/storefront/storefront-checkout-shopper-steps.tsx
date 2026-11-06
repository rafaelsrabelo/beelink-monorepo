"use client"

// React
import { useRef, useState, type ReactNode } from "react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import type { PaymentMethod } from "../store/store-types"
import type { StorefrontCheckoutChoice, StorefrontCheckoutOnline, StorefrontCheckoutShipping } from "./storefront-checkout-choices"
import { StorefrontCheckoutFulfillment } from "./storefront-checkout-fulfillment"
import { StorefrontCheckoutPayment } from "./storefront-checkout-payment"
import { StorefrontCheckoutStep } from "./storefront-checkout-step"
import type { StorefrontCheckoutCustomer } from "./storefront-checkout"

export interface StorefrontCheckoutShopperStepsProps {
  customer: StorefrontCheckoutCustomer
  choice: StorefrontCheckoutChoice
  onChoiceChange: (choice: StorefrontCheckoutChoice) => void
  shipping: StorefrontCheckoutShipping | null
  recipientDocument: { value: string; onChange: (value: string) => void } | null
  paymentMethods: readonly PaymentMethod[]
  online: StorefrontCheckoutOnline | null
  nothingToPay: string | null
  /** Why the delivery cannot go on as chosen, in words; null when it can. It keeps the step open. */
  deliveryIssue: string | null
  /** The refusal of the last order, drawn by the caller, over the button. */
  alert: ReactNode
  /** The button that places the order, drawn by the caller. */
  placeButton: ReactNode
  pending: boolean
  linkComponent?: LinkComponent
  messages?: UiMessages
}

const LINK = "min-h-11 text-sm font-semibold text-shop-primary-ink hover:underline"
const SECONDARY = "h-12 rounded-xl border border-shop-primary text-base font-semibold text-shop-primary-ink transition-colors hover:bg-shop-primary-tint"

/**
 * A signed-in shopper's checkout in three steps (plan 2026-11-06--checkout-em-etapas). Who they are
 * is done already: a line, with the way to change it. The delivery is open while something is
 * wanting — no address yet, an address refused, a place the shop does not reach, a carrier's CPF —
 * and otherwise done in a line saying where, what it costs and when, so a shopper who comes back with
 * an address on file is at the payment at once. "Continuar para o pagamento" says what is wanting
 * rather than staying grey; "Alterar" opens the delivery again.
 */
export function StorefrontCheckoutShopperSteps({
  customer,
  choice,
  onChoiceChange,
  shipping,
  recipientDocument,
  paymentMethods,
  online,
  nothingToPay,
  deliveryIssue,
  alert,
  placeButton,
  pending,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontCheckoutShopperStepsProps) {
  const text = messages.storefront
  const paymentHeading = useRef<HTMLHeadingElement>(null)
  const chosen = customer.addresses.find((address) => address.id === choice.addressId) ?? customer.addresses[0] ?? null
  // Open on arrival for a shopper with no address on file — how to receive it is theirs to say, never a pick-up assumed — and for an address refused.
  const [editing, setEditing] = useState(() => !chosen || Boolean(customer.addressForm?.startOpen) || deliveryIssue !== null)
  // The last press on "Continuar" found the delivery wanting: said until it no longer is.
  const [asked, setAsked] = useState(false)
  // A delivery that stops holding — the quote says the shop does not reach the address — opens again,
  // and stays open while the shopper fixes it: it closes on their "Continuar", never under their hand.
  if (deliveryIssue !== null && !editing) setEditing(true)
  const deliveryOpen = editing

  function toPayment() {
    if (deliveryIssue) return setAsked(true)
    setAsked(false)
    setEditing(false)
    // After the step opens: the focus goes to it, and on a phone the screen goes with the focus.
    requestAnimationFrame(() => paymentHeading.current?.focus())
  }

  const ways = shipping?.ways ?? []
  const way = ways.find((each) => each.id === choice.wayId) ?? ways[0] ?? null
  const terms = shipping ? (way ? (ways.length > 1 ? `${way.title} · ${way.detail}` : way.detail) : shipping.note) : text.checkoutFeeLater
  const deliverySummary =
    choice.fulfillment === "PICKUP" ? (
      <p>{text.checkoutPickup}</p>
    ) : chosen ? (
      <>
        <p>{format(text.checkoutDeliverTo, { address: chosen.line })}</p>
        {terms ? <p className="text-xs text-shop-muted">{terms}</p> : null}
      </>
    ) : null

  return (
    <>
      <StorefrontCheckoutStep
        step={1}
        total={3}
        title={text.checkoutIdentityTitle}
        state="done"
        summary={
          <>
            <p>{customer.lines.join(" · ")}</p>
            {customer.complete ? null : <p className="text-xs text-shop-muted">{text.checkoutPhoneMissing}</p>}
          </>
        }
        edit={
          customer.editAction ? (
            <form action={customer.editAction.action} method="post">
              {Object.entries(customer.editAction.hidden).map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
              ))}
              <button type="submit" disabled={pending} className={LINK}>
                {text.checkoutStepEdit}
              </button>
            </form>
          ) : (
            <Link href={customer.editHref} className={LINK}>
              {text.checkoutStepEdit}
            </Link>
          )
        }
        messages={messages}
      />

      <StorefrontCheckoutStep
        step={2}
        total={3}
        title={text.checkoutStepDelivery}
        state={deliveryOpen ? "open" : "done"}
        summary={deliverySummary}
        edit={
          <button type="button" onClick={() => setEditing(true)} disabled={pending} className={LINK}>
            {text.checkoutStepEdit}
          </button>
        }
        messages={messages}
      >
        <StorefrontCheckoutFulfillment
          value={choice}
          onChange={onChoiceChange}
          addresses={customer.addresses}
          addHref={customer.addAddressHref}
          addressForm={customer.addressForm ?? null}
          shipping={shipping}
          recipientDocument={recipientDocument}
          disabled={pending}
          linkComponent={Link}
          messages={messages}
        />
        {asked && deliveryIssue ? (
          <p role="alert" className="rounded-[10px] border border-shop-sale-ink/30 px-4 py-3 text-sm text-shop-sale-ink">
            {deliveryIssue}
          </p>
        ) : null}
        <button type="button" onClick={toPayment} className={SECONDARY}>
          {text.checkoutStepToPayment}
        </button>
      </StorefrontCheckoutStep>

      <StorefrontCheckoutStep
        step={3}
        total={3}
        title={text.checkoutPayment}
        state={deliveryOpen ? "locked" : "open"}
        hint={text.checkoutStepDeliveryFirst}
        headingRef={paymentHeading}
        messages={messages}
      >
        <StorefrontCheckoutPayment value={choice} onChange={onChoiceChange} offlineMethods={paymentMethods} online={online} nothingToPay={nothingToPay} disabled={pending} titled={false} messages={messages} />
        {alert}
        {placeButton}
      </StorefrontCheckoutStep>
    </>
  )
}
