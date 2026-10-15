// Libs
import { StoreIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontUnavailableProps {
  /** The shop's own name: the page's heading. */
  name: string
  logoUrl?: string | null
  /** Where a customer who bought here reads their orders. Null for a site, which takes none. */
  ordersHref?: string | null
  /** A site, not a shop: it is said to be a site, and nothing is said of orders it never took. */
  site?: boolean
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * A shop window off the air (BEELINK-223): the shop's name and that it is unavailable — no product, no
 * price, no basket — and, for a shop, the way to a customer's own orders, which still answer. Why it
 * is unavailable is the shopkeeper's business, and never said here.
 */
export function StorefrontUnavailable({ name, logoUrl = null, ordersHref = null, site = false, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontUnavailableProps) {
  const text = messages.storefront

  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-3 px-2 py-16 text-center">
      {logoUrl ? (
        // The name is the heading right under it: the logo says nothing more.
        <img src={logoUrl} alt="" className="mb-2 h-16 w-auto max-w-48 object-contain" />
      ) : (
        <StoreIcon aria-hidden="true" className="mb-2 size-12 text-shop-muted" strokeWidth={1.5} />
      )}
      <h1 className="text-2xl font-semibold text-balance">{name}</h1>
      <p className="text-lg font-semibold">{site ? text.unavailableSiteTitle : text.unavailableTitle}</p>
      <p className="max-w-md text-shop-muted">{site ? text.unavailableSiteBody : text.unavailableBody}</p>
      {ordersHref ? (
        <Link href={ordersHref} className="mt-3 rounded-[10px] bg-shop-primary px-4 py-2 text-sm font-semibold text-shop-on-primary">
          {text.unavailableOrders}
        </Link>
      ) : null}
    </section>
  )
}
