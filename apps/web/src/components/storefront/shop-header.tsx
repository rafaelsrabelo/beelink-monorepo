// React
import type { ReactNode } from "react"

// Types
import type { PublicStore } from "@harness-monorepo/contracts"
import type { StorefrontWindowProps } from "@harness-monorepo/ui/blocks/storefront/storefront-window"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { headerAccountMenuOf } from "@/lib/account-menu"
import type { StorefrontRoutes } from "@/lib/storefront-routes"
import { ShopperConversationsLive } from "./conversations/shopper-conversations-live"
import { StorefrontCartLinkLive } from "./storefront-cart-link-live"
import { StorefrontDeliverToLive } from "./storefront-deliver-to-live"
import { StorefrontSearchLive } from "./storefront-search-live"

export interface ShopHeaderOptions {
  /** What was searched for, said back in the field. */
  searchValue?: string | undefined
  /** "Buscar em": every top-level category, opening on `scope`. */
  scopes: { value: string; label: string }[]
  scope: string
  /** The design preview's plain search and "Entregar em", which keep nothing. */
  searchSlot?: ReactNode
  deliverToSlot?: ReactNode
  /** The signed-in shopper, with their default address's CEP; null or absent, a visitor. */
  shopper?: { name: string; address?: { zipCode: string | null } } | null | undefined
  messages: UiMessages
}

export type ShopHeader = Pick<
  StorefrontWindowProps,
  "searchSlot" | "deliverTo" | "searchAction" | "searchScopes" | "searchScope" | "cartHref" | "cartSlot" | "accountHref" | "accountName" | "accountMenu" | "conversationsSlot"
>

/**
 * A shop's header beside its logo: the live search, which answers while someone types and falls back
 * to the plain form with scripting off; the visitor's CEP for the shipping quote; the basket; and the
 * shopper's own door — the shop's sign-in, never the panel's `/login` — opening their pages as a menu
 * once signed in (J21), with their conversations.
 *
 * A shop off the air — its page locked for want of payment (BEELINK-296) — sells nothing, and its header
 * offers nothing to buy: no search, no "Entregar em", no basket, each of which led to the notice. What
 * stays is the customer's own, the account and the conversations, which the API still answers
 * (BEELINK-223).
 */
export function shopHeaderOf(store: PublicStore, routes: StorefrontRoutes, { searchValue, scopes, scope, searchSlot, deliverToSlot, shopper, messages }: ShopHeaderOptions): ShopHeader {
  const own = {
    accountHref: shopper ? routes.account() : routes.signIn(),
    accountName: shopper?.name ?? null,
    accountMenu: shopper ? headerAccountMenuOf(routes, store.slug) : undefined,
    conversationsSlot: shopper ? <ShopperConversationsLive slug={store.slug} routeWords={store.routeWords} messages={messages} /> : undefined,
  }
  if (store.unavailable) return own

  return {
    searchSlot: searchSlot ?? <StorefrontSearchLive slug={store.slug} routeWords={store.routeWords} initialTerm={searchValue} scopes={scopes} initialScope={scope} locale="pt-BR" messages={messages} />,
    deliverTo: deliverToSlot ?? <StorefrontDeliverToLive slug={store.slug} defaultCep={shopper?.address?.zipCode ?? null} messages={messages} />,
    searchAction: routes.search(),
    searchScopes: scopes,
    searchScope: scope,
    cartHref: routes.cart(),
    cartSlot: <StorefrontCartLinkLive href={routes.cart()} messages={messages} />,
    ...own,
  }
}
