// Libs
import { ShoppingBagIcon } from "lucide-react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontCartLinkProps {
  href: string
  /** Items in the cart, every unit counted. */
  count?: number
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The header's cart, as 5a and 5b draw it: the bag with its count, and the word beside it from
 * `shop-lg`. The count lives in the link's name, "Carrinho, 3 itens", and the badge is for the eye.
 *
 * It only draws a number. The web wraps it in a component that reads the cart as it fills; the
 * header uses it as it is where nothing can fill one.
 */
export function StorefrontCartLink({ href, count = 0, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontCartLinkProps) {
  const text = messages.storefront

  return (
    <Link
      href={href}
      aria-label={count === 1 ? text.cartWithOne : format(text.cartWithCount, { count: String(count) })}
      className="flex shrink-0 items-center gap-1.5 text-sm font-bold"
    >
      <span className="relative flex">
        <ShoppingBagIcon aria-hidden="true" className="size-7" strokeWidth={1.8} />
        {count > 0 ? (
          // The brand toned against the header, so it shows on a header painted in the brand.
          <span
            aria-hidden="true"
            className="absolute -top-1.5 -right-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-semibold"
            style={{ backgroundColor: "var(--shop-primary-on-header)", color: "var(--shop-on-primary-on-header)" }}
          >
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </span>
      <span className="hidden shop-lg:inline">{text.cart}</span>
    </Link>
  )
}
