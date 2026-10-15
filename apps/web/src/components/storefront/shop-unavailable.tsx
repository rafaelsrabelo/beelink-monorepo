// UI
import { StorefrontUnavailable } from "@harness-monorepo/ui/blocks/storefront/storefront-unavailable"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import type { ServedShop } from "@/lib/storefront-data"
import { storefrontRoutes } from "@/lib/storefront-routes"
import { StorefrontFrame } from "./storefront-frame"

/**
 * A shop window off the air (BEELINK-223), in place of any page of it that sells: the page alone, in
 * the shop's colours, with no header, menu, search or basket — and, for a shop, the way to a customer's
 * own orders, which still open — at the address the visitor came by, the shop's own domain included. A
 * site takes no orders, and offers none.
 */
export function ShopUnavailable({ store, messages }: { store: ServedShop; messages: UiMessages }) {
  const routes = storefrontRoutes(store)

  return (
    <StorefrontFrame store={store} categories={[]} year={new Date().getFullYear()} chrome={false} messages={messages}>
      <StorefrontUnavailable
        name={store.name}
        logoUrl={store.logoUrl}
        ordersHref={store.type === "INSTITUTIONAL" ? null : routes.accountTab("orders")}
        linkComponent={AppLink}
        messages={messages}
      />
    </StorefrontFrame>
  )
}
