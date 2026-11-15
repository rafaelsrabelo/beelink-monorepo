// Types
import type { PublicStore } from "@harness-monorepo/contracts"
import type { StorefrontFooterColumn, StorefrontMenuItem } from "@harness-monorepo/ui/blocks/storefront/storefront-window"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { orderHrefOf } from "./storefront-links"
import { shopLegalColumnOf } from "./shop-legal-column"
import { recruitingOf } from "@/lib/affiliate-join"
import type { StorefrontRoutes } from "@/lib/storefront-routes"

/**
 * A shop's footer: its own pages, the landings it links, and how to reach a person.
 *
 * Built here and not in the block for the reason every href is: a block that knew "Produtos" links
 * to `routeWords.products` would be holding the very word this whole scheme keeps out of components.
 *
 * Off the air — its page locked for want of payment (BEELINK-296) — the shop's own column and the
 * order by WhatsApp go: each sold, and the pages led to the notice. The legal column stays, beside the
 * customer's pages that still answer.
 */
export function shopFooterColumnsOf(
  store: PublicStore & { affiliate?: string | null },
  routes: StorefrontRoutes,
  messages: UiMessages,
  pages: readonly StorefrontMenuItem[] = [],
): StorefrontFooterColumn[] {
  const text = messages.storefront
  const whatsapp = orderHrefOf(store)
  if (store.unavailable) return [shopLegalColumnOf(store, messages)]

  return [
    {
      id: "shop",
      title: text.footerShop,
      items: [
        { label: text.catalogTitle, href: routes.catalog() },
        { label: text.categoriesTitle, href: routes.categories() },
        { label: text.cart, href: routes.cart() },
        ...pages.map(({ label, href }) => ({ label, href })),
        // The shop's "Seja afiliado" page, where the shopkeeper chose the footer (plan 2026-11-14).
        ...(recruitingOf(store)?.placements.footerLink ? [{ label: messages.affiliateJoin.footerLink, href: routes.affiliateJoin() }] : []),
      ],
    },
    ...(whatsapp ? [{ id: "contact", title: text.footerContact, items: [{ label: text.order, href: whatsapp }] }] : []),
    shopLegalColumnOf(store, messages),
  ]
}
