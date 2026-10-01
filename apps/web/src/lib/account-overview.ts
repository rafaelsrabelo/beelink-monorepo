// Types
import type { CustomerOrder, CustomerOrderSummary, CustomerProfile } from "@harness-monorepo/contracts"
import type { StorefrontAccountDetailsProps } from "@harness-monorepo/ui/blocks/storefront/storefront-account-details"
import type { StorefrontAccountLastOrder } from "@harness-monorepo/ui/blocks/storefront/storefront-account-orders-note"
import type { StorefrontOrderNowProps } from "@harness-monorepo/ui/blocks/storefront/storefront-order-now"

// UI
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"
import { customerTotalText } from "@harness-monorepo/ui/lib/order-total"
import { format } from "@harness-monorepo/ui/locales/index"

// App
import { phoneLineOf } from "./account-menu"
import { addressLineOf, addressShortOf, isDeliverable, zipCodeOf } from "./customer-address"
import { orderStatusLineOf, type OrderCardContext } from "./order-card-view"
import { orderListEntriesOf } from "./order-list-query"
import { orderStepsOf } from "./order-steps"
import { estimateLineOf } from "./order-estimate"
import { estimateOf } from "./order-page-view"

/** The list narrowed to the orders on their way: where the front sends a shopper to see the others. */
export function ordersInProgressHrefOf(routes: OrderCardContext["routes"]): string {
  return routes.accountTab("orders", orderListEntriesOf({ situation: "ACTIVE", period: undefined, search: "", page: 1 }))
}

/**
 * The order on its way, as the front tells it (6c): its number and total, where it stands, where it
 * goes, and its steps. `others` are the rest on their way, which the front points to in one line.
 */
export function orderNowViewOf(order: CustomerOrder, others: number, context: OrderCardContext): Omit<StorefrontOrderNowProps, "linkComponent" | "messages"> {
  const { routes, locale, messages } = context
  const text = messages.storefront
  // The moment it reached its status, as the list's summary carries it.
  const statusAt = order.events.findLast((event) => event.status === order.status)?.at ?? order.placedAt
  const address = order.deliveryAddress
  const estimate = estimateOf(order)

  return {
    eyebrow: format(text.accountInProgressEyebrow, { number: String(order.number), total: `${customerTotalText(formatCents(order.totalCents, locale, "BRL"), order, text.orderTotalPlusFee)} · ${messages.orders.payments[order.paymentMethod]}` }),
    headline: orderStatusLineOf({ ...order, statusAt }, context).headline,
    destination:
      order.fulfillment === "PICKUP"
        ? text.orderPickupLabel
        : address
          ? format(text.accountShipTo, { name: address.recipientName, address: addressShortOf(address) ?? "" })
          : null,
    note: order.status === "RECEIVED" ? text.orderReceivedHint : estimate ? estimateLineOf(estimate, locale, messages) : null,
    steps: orderStepsOf(order, context) ?? [],
    href: routes.accountOrder(order.number),
    more: others > 0 ? { label: format(others === 1 ? text.accountMoreInProgress : text.accountMoreInProgressMany, { count: String(others) }), href: ordersInProgressHrefOf(routes) } : null,
  }
}

/** How the last order ended, in the list card's own words. */
export function lastOrderViewOf(order: CustomerOrderSummary, context: OrderCardContext): StorefrontAccountLastOrder {
  return { number: order.number, ...orderStatusLineOf(order, context) }
}

/**
 * What the shop has of the shopper, each part in words or null when it is not on file — and whether
 * the address is one the shop can deliver to, the rule the checkout asks by.
 */
export function accountDetailsViewOf(shopper: CustomerProfile): Pick<StorefrontAccountDetailsProps, "phone" | "email" | "address" | "addressIncomplete"> {
  const address = addressLineOf({ ...shopper.address, zipCode: zipCodeOf(shopper.address.zipCode) })
  return { phone: phoneLineOf(shopper.phone), email: shopper.email, address, addressIncomplete: Boolean(address) && !isDeliverable(shopper.address) }
}
