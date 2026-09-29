// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontOrdersLinkProps {
  href: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The header's way to the shopper's orders, beside their account (6c): two lines from `shop-lg`,
 * nothing below it, where the phone's header holds the account mark alone. "Meus pedidos" and not
 * the design's "Devoluções e pedidos": the product has no returns flow to promise.
 */
export function StorefrontOrdersLink({ href, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontOrdersLinkProps) {
  const text = messages.storefront

  return (
    <Link href={href} aria-label={text.accountOrders} className="hidden shrink-0 flex-col text-xs leading-[1.3] shop-lg:flex">
      <span aria-hidden="true" className="opacity-85">
        {text.ordersLinkTop}
      </span>
      <span aria-hidden="true" className="text-sm font-bold">
        {text.accountOrders}
      </span>
    </Link>
  )
}
