"use client"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { WhatsAppIcon } from "../store/store-brand-icons"
import type { PaymentMethod } from "../store/store-types"
import { StorefrontCheckoutChoices, type StorefrontCheckoutAddress, type StorefrontCheckoutChoice, type StorefrontCheckoutShipping } from "./storefront-checkout-choices"

export type { CheckoutFulfillment, StorefrontCheckoutAddress, StorefrontCheckoutChoice, StorefrontCheckoutShipping } from "./storefront-checkout-choices"

export interface StorefrontCheckoutCustomer {
  /** Name and phone, a line each — only the ones on file; the addresses are `addresses`. */
  lines: readonly string[]
  /** Whether the shop has a phone and an address for them; without, a hint says so. */
  complete: boolean
  /** Where to change them, coming back here after. */
  editHref: string
  /** Their saved addresses a delivery can go to, the default first. */
  addresses: readonly StorefrontCheckoutAddress[]
  /** Where they add an address, coming back here after. */
  addAddressHref: string
}

export interface StorefrontCheckoutProps {
  /**
   * Where the conversation goes once the order is placed: the shop's WhatsApp, opened with the
   * order's number, or nowhere — a shop without WhatsApp still takes the order, and confirms it.
   */
  channel: "whatsapp" | "shop"
  /** Who is ordering, as the shop keeps them. Null: nobody is signed in. */
  customer: StorefrontCheckoutCustomer | null
  /** Where a visitor signs in or signs up to order. The cart is a cookie, so it waits for them. */
  signIn: { signInHref: string; signUpHref: string }
  /** The methods the shop takes. */
  paymentMethods: readonly PaymentMethod[]
  choice: StorefrontCheckoutChoice
  onChoiceChange: (choice: StorefrontCheckoutChoice) => void
  /** What the shop's delivery rules quote to the chosen address; null while nobody knows. */
  shipping?: StorefrontCheckoutShipping | null
  /** Places the order; the page opens WhatsApp itself once the order has its number. */
  onPlace: () => void
  /** The order is on its way to the shop: nothing is pressed twice. */
  pending?: boolean
  /** Why the order was not placed, already in words. */
  error?: string | null
  /** Nothing in the cart can be ordered now: the button stays, and does nothing until it can. */
  disabled?: boolean
  linkComponent?: LinkComponent
  messages?: UiMessages
}

const PRIMARY = "flex h-12 items-center justify-center gap-2 rounded-xl bg-shop-primary text-base font-semibold text-shop-on-primary"

/**
 * The way out of the cart, under the subtotal. Anyone can fill a cart and see the total; placing
 * the order asks who is placing it (docs/product/README.md: "buying requires a verified identity;
 * reaching the checkout does not"). A signed-in shopper sees their details as the shop keeps them,
 * chooses how to receive and pay, and places the order — which exists from then on, whether the
 * conversation goes on in the shop's WhatsApp or not. There is no payment here.
 */
export function StorefrontCheckout({
  channel,
  customer,
  signIn,
  paymentMethods,
  choice,
  onChoiceChange,
  shipping = null,
  onPlace,
  pending = false,
  error,
  disabled = false,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontCheckoutProps) {
  const text = messages.storefront
  const alert = error ? (
    <p role="alert" className="rounded-[10px] border border-shop-sale-ink/30 px-4 py-3 text-sm text-shop-sale-ink">
      {error}
    </p>
  ) : null

  if (!customer) {
    return (
      <div className="flex flex-col gap-3">
        {/* A session that ended while ordering lands here, and says so rather than only asking again. */}
        {alert}
        <p className="text-sm text-shop-muted">{text.checkoutSignInPrompt}</p>
        <Link href={signIn.signInHref} className={PRIMARY}>
          {text.checkoutSignIn}
        </Link>
        <Link href={signIn.signUpHref} className="text-center text-sm font-semibold text-shop-primary-ink hover:underline">
          {text.checkoutSignUp}
        </Link>
      </div>
    )
  }

  const label = pending ? text.checkoutPlacing : channel === "whatsapp" ? text.checkoutWhatsApp : text.checkoutPlace

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 rounded-[10px] border border-shop-line bg-shop-fill px-4 py-3 text-sm">
        <p className="text-xs text-shop-muted">{text.checkoutFor}</p>
        {customer.lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
        {customer.complete ? null : <p className="text-xs text-shop-muted">{text.checkoutPhoneMissing}</p>}
        <Link href={customer.editHref} className="self-start text-xs font-semibold text-shop-primary-ink hover:underline">
          {text.checkoutEdit}
        </Link>
      </div>

      <StorefrontCheckoutChoices
        value={choice}
        onChange={onChoiceChange}
        addresses={customer.addresses}
        addHref={customer.addAddressHref}
        paymentMethods={paymentMethods}
        shipping={shipping}
        disabled={pending}
        linkComponent={Link}
        messages={messages}
      />

      {alert}

      <button
        type="button"
        onClick={onPlace}
        disabled={disabled || pending}
        aria-busy={pending || undefined}
        className={`${PRIMARY} transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {channel === "whatsapp" ? <WhatsAppIcon className="size-5" /> : null}
        {label}
      </button>
    </div>
  )
}
