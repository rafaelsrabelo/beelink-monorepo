// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontCartCheckoutCallProps {
  /** The checkout, with the coupon the cart carries. */
  href: string
  /** "em até 6x de R$ 21,50 sem juros", on the total; null when it is paid in full only. */
  installments?: string | null
  /** Nothing in the cart can be ordered now — every line sold out: there is no checkout to go to. */
  disabled?: boolean
  linkComponent?: LinkComponent
  messages?: UiMessages
}

const PRIMARY = "flex h-12 items-center justify-center rounded-xl bg-shop-primary text-base font-semibold text-shop-on-primary"

/**
 * The cart's way on, under its amounts: how the total splits on a card, that the delivery is priced
 * in the checkout — the cart has no address yet — and "Finalizar compra", a link to the checkout's
 * own page. A cart with nothing to order draws the button pressed down, never a link to a checkout
 * that would only send the shopper back.
 */
export function StorefrontCartCheckoutCall({ href, installments = null, disabled = false, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontCartCheckoutCallProps) {
  const text = messages.storefront

  return (
    <div className="flex flex-col gap-3">
      {installments ? <p className="-mt-2 text-end text-sm text-shop-muted">{installments}</p> : null}
      <p className="text-sm text-shop-muted">{text.cartShippingAtCheckout}</p>
      {disabled ? (
        <button type="button" disabled className={`${PRIMARY} cursor-not-allowed opacity-50`}>
          {text.cartCheckout}
        </button>
      ) : (
        <Link href={href} className={`${PRIMARY} transition-opacity hover:opacity-90`}>
          {text.cartCheckout}
        </Link>
      )}
    </div>
  )
}
