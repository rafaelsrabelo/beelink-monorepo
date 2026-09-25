"use client"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { WhatsAppIcon } from "../store/store-brand-icons"

export interface StorefrontCheckoutCustomer {
  /** Name, phone and address, a line each — only the ones on file. */
  lines: readonly string[]
  /** Whether the shop has a phone and an address for them; without, a hint says so. */
  complete: boolean
  /** Where to change them, coming back here after. */
  editHref: string
}

export interface StorefrontCheckoutProps {
  /** The order's `wa.me` link, or null when the shop has no WhatsApp: no button, and a sentence why. */
  href: string | null
  /** Who is ordering, as the shop keeps them. Null: nobody is signed in. */
  customer: StorefrontCheckoutCustomer | null
  /** Where a visitor signs in or signs up to order. The cart is a cookie, so it waits for them. */
  signIn: { signInHref: string; signUpHref: string }
  /** Nothing in the cart can be ordered now: the button stays, and does nothing until it can. */
  disabled?: boolean
  /** Told as the link opens, with the link: the page empties the cart and keeps it for a retry. */
  onSend?: (href: string) => void
  linkComponent?: LinkComponent
  messages?: UiMessages
}

const PRIMARY = "flex h-12 items-center justify-center gap-2 rounded-xl bg-shop-primary text-base font-semibold text-shop-on-primary"

/**
 * The way out of the cart, under the subtotal. Anyone can fill a cart and see the total; placing
 * the order asks who is placing it (docs/product/README.md: "buying requires a verified identity;
 * reaching the checkout does not"). A signed-in shopper sees their details as the shop keeps them
 * and sends the order to the shop's WhatsApp, where it ends — there is no payment here.
 */
export function StorefrontCheckout({ href, customer, signIn, disabled = false, onSend, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontCheckoutProps) {
  const text = messages.storefront

  if (!href) return <p className="text-sm text-shop-muted">{text.checkoutNoWhatsApp}</p>

  if (!customer) {
    return (
      <div className="flex flex-col gap-3">
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

  return (
    <div className="flex flex-col gap-3">
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
      {disabled ? (
        <button type="button" disabled className={`${PRIMARY} opacity-50`}>
          <WhatsAppIcon className="size-5" />
          {text.checkoutWhatsApp}
        </button>
      ) : (
        <a href={href} target="_blank" rel="noreferrer" onClick={() => onSend?.(href)} className={`${PRIMARY} transition-opacity hover:opacity-90`}>
          <WhatsAppIcon className="size-5" />
          {text.checkoutWhatsApp}
        </a>
      )}
    </div>
  )
}
