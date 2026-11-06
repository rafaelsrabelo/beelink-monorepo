"use client"

// React
import type { ReactNode } from "react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { WhatsAppIcon } from "../store/store-brand-icons"
import type { PaymentMethod } from "../store/store-types"
import {
  type StorefrontCheckoutAddress,
  type StorefrontCheckoutAddressForm,
  type StorefrontCheckoutChoice,
  type StorefrontCheckoutChoicesProps,
  type StorefrontCheckoutShipping,
} from "./storefront-checkout-choices"
import { StorefrontCheckoutShopperSteps } from "./storefront-checkout-shopper-steps"
import { StorefrontCheckoutStep } from "./storefront-checkout-step"

export type {
  CheckoutFulfillment,
  CheckoutOnlineMethod,
  CheckoutPaymentChannel,
  StorefrontCheckoutAddress,
  StorefrontCheckoutAddressForm,
  StorefrontCheckoutChoice,
  StorefrontCheckoutOnline,
  StorefrontCheckoutShipping,
  StorefrontCheckoutWay,
} from "./storefront-checkout-choices"

export interface StorefrontCheckoutCustomer {
  /** Name and phone, a line each — only the ones on file; the addresses are `addresses`. */
  lines: readonly string[]
  /** Whether the shop has a phone and an address for them; without, a hint says so. */
  complete: boolean
  /** Where to change them, coming back here after. */
  editHref: string
  /** Their saved addresses a delivery can go to, the default first. */
  addresses: readonly StorefrontCheckoutAddress[]
  /** Where they add an address, coming back here after: what stands without `addressForm`. */
  addAddressHref: string
  /** The address form, opened here in the checkout; absent, adding one is `addAddressHref`. */
  addressForm?: StorefrontCheckoutAddressForm | null
}

export interface StorefrontCheckoutProps {
  /**
   * Where the conversation goes once the order is placed: the shop's WhatsApp, opened with the
   * order's number, or nowhere — a shop without WhatsApp still takes the order, and confirms it.
   * `pay` is an order charged online (BEELINK-205): placing it leads to its payment, here in the shop.
   */
  channel: "whatsapp" | "shop" | "pay"
  /** Who is ordering, as the shop keeps them. Null: nobody is signed in. */
  customer: StorefrontCheckoutCustomer | null
  /** Where a visitor signs in or signs up to order. The cart is a cookie, so it waits for them. */
  signIn: { signInHref: string; signUpHref: string }
  /** Who is buying, asked here in place of a sign-in (`StorefrontCheckoutIdentity`); absent, the visitor is sent to sign in, as before. */
  identity?: ReactNode
  /** The methods the shop settles by on delivery or at pickup; none when it turned that off. */
  paymentMethods: readonly PaymentMethod[]
  /** What the shop charges online for this cart; null when it charges nothing online. */
  online?: StorefrontCheckoutChoicesProps["online"]
  /** The order has nothing to pay: said in place of the payment's choices. */
  nothingToPay?: string | null
  choice: StorefrontCheckoutChoice
  onChoiceChange: (choice: StorefrontCheckoutChoice) => void
  /** What the shop's delivery rules quote to the chosen address; null while nobody knows. */
  shipping?: StorefrontCheckoutShipping | null
  /** The CPF of who receives a carrier's delivery, asked when the record has none; null asks for none. */
  recipientDocument?: StorefrontCheckoutChoicesProps["recipientDocument"]
  /** Why the delivery cannot go on as chosen, in words; null when it can. It keeps the delivery's step open. */
  deliveryIssue?: string | null
  /** Places the order; the page opens WhatsApp itself once the order has its number. */
  onPlace: () => void
  /** The order is on its way to the shop: nothing is pressed twice. */
  pending?: boolean
  /** Why the order was not placed, already in words. */
  error?: string | null
  /** Nothing in the cart can be ordered now: the button stays, and does nothing until it can. */
  disabled?: boolean
  /** The checkout's anchor, which a way back to the cart lands on rather than the page's top. */
  id?: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

const PRIMARY = "flex h-12 items-center justify-center gap-2 rounded-xl bg-shop-primary text-base font-semibold text-shop-on-primary"

/**
 * The way out of the cart, under the subtotal. Anyone can fill a cart and see the total; placing
 * the order asks who is placing it (docs/product/README.md: "buying requires a verified identity;
 * reaching the checkout does not"). A signed-in shopper sees their details as the shop keeps them,
 * chooses how to receive and pay, and places the order — which exists from then on, whether the
 * conversation goes on in the shop's WhatsApp or not. Nothing is paid on this screen: an order
 * charged online leads to its payment once placed.
 */
export function StorefrontCheckout({
  channel,
  customer,
  signIn,
  identity = null,
  paymentMethods,
  online = null,
  nothingToPay = null,
  choice,
  onChoiceChange,
  shipping = null,
  recipientDocument = null,
  deliveryIssue = null,
  onPlace,
  pending = false,
  error,
  disabled = false,
  id,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontCheckoutProps) {
  const text = messages.storefront
  const alert = error ? (
    <p role="alert" className="rounded-[10px] border border-shop-sale-ink/30 px-4 py-3 text-sm text-shop-sale-ink">
      {error}
    </p>
  ) : null

  if (!customer && identity) {
    return (
      <div id={id} className="flex scroll-mt-24 flex-col gap-3">
        {alert}
        <StorefrontCheckoutStep step={1} total={3} title={text.checkoutIdentityTitle} state="open" messages={messages}>
          {identity}
        </StorefrontCheckoutStep>
        <StorefrontCheckoutStep step={2} total={3} title={text.checkoutStepDelivery} state="locked" hint={text.checkoutStepIdentityFirst} messages={messages} />
        <StorefrontCheckoutStep step={3} total={3} title={text.checkoutPayment} state="locked" hint={text.checkoutStepDeliveryFirst} messages={messages} />
      </div>
    )
  }

  if (!customer) {
    return (
      <div id={id} className="flex scroll-mt-24 flex-col gap-3">
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

  const label = pending ? text.checkoutPlacing : channel === "whatsapp" ? text.checkoutWhatsApp : channel === "pay" ? text.checkoutPayOnline : text.checkoutPlace

  const placeButton = (
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
  )

  return (
    <div id={id} className="flex scroll-mt-24 flex-col gap-3">
      <StorefrontCheckoutShopperSteps
        customer={customer}
        choice={choice}
        onChoiceChange={onChoiceChange}
        shipping={shipping}
        recipientDocument={recipientDocument}
        paymentMethods={paymentMethods}
        online={online}
        nothingToPay={nothingToPay}
        deliveryIssue={deliveryIssue}
        alert={alert}
        placeButton={placeButton}
        pending={pending}
        linkComponent={Link}
        messages={messages}
      />
    </div>
  )
}
