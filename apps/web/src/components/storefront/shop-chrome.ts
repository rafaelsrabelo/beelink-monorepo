// Types
import type { PublicStore } from "@harness-monorepo/contracts"
import type { StorefrontFooterColumn, StorefrontMenuItem } from "@harness-monorepo/ui/blocks/storefront/storefront-window"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { orderHrefOf } from "./storefront-links"
import type { StorefrontRoutes } from "@/lib/storefront-routes"

/**
 * A shop's footer: its own pages, the landings it links, and how to reach a person.
 *
 * Built here and not in the block for the reason every href is: a block that knew "Produtos" links
 * to `routeWords.products` would be holding the very word this whole scheme keeps out of components.
 */
export function shopFooterColumnsOf(
  store: PublicStore,
  routes: StorefrontRoutes,
  messages: UiMessages,
  pages: readonly StorefrontMenuItem[] = [],
): StorefrontFooterColumn[] {
  const text = messages.storefront
  const whatsapp = orderHrefOf(store)

  return [
    {
      id: "shop",
      title: text.footerShop,
      items: [
        { label: text.catalogTitle, href: routes.catalog() },
        { label: text.categoriesTitle, href: routes.categories() },
        { label: text.cart, href: routes.cart() },
        ...pages.map(({ label, href }) => ({ label, href })),
      ],
    },
    ...(whatsapp ? [{ id: "contact", title: text.footerContact, items: [{ label: text.order, href: whatsapp }] }] : []),
  ]
}
