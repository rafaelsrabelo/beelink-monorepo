// UI
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { CustomerProfile, Order } from "@harness-monorepo/contracts"

// App
import type { CartView } from "./cart-view"
import { addressLineOf } from "./customer-address"

export interface OrderMessageInput {
  shopName: string
  view: Pick<CartView, "rows" | "subtotalCents">
  /** Who is ordering, as the shop keeps them: their name, phone and address go under the total. */
  customer?: Pick<CustomerProfile, "name" | "phone" | "address"> | null
  locale: string
  messages: UiMessages
}

/**
 * The order as the shop reads it on WhatsApp: a greeting, one line per thing that can be ordered —
 * quantity, name, combination, the line's total — the total, and who is ordering. A
 * sold-out line is left out: the cart already said it would not be ordered.
 */
export function orderMessageOf({ shopName, view, customer, locale, messages }: OrderMessageInput): string {
  const text = messages.storefront
  const money = (cents: number) => formatCents(cents, locale, "BRL")
  const lines = view.rows
    .filter((row) => row.available)
    .map((row) =>
      format(text.orderLine, {
        qty: String(row.qty),
        name: row.variantLabel ? `${row.name} (${row.variantLabel})` : row.name,
        total: money(row.lineTotalCents),
      }),
    )
  const address = customer ? addressLineOf(customer.address) : null

  return [
    format(text.orderGreeting, { shop: shopName }),
    "",
    ...lines,
    "",
    format(text.orderTotal, { total: money(view.subtotalCents) }),
    ...(customer ? [format(text.orderCustomer, { name: customer.name })] : []),
    ...(customer?.phone ? [format(text.orderPhone, { phone: customer.phone })] : []),
    ...(address ? [format(text.orderAddress, { address })] : []),
  ].join("\n")
}

export interface ShopOrderMessageInput {
  shopName: string
  order: Pick<Order, "number" | "status" | "customer" | "items" | "fulfillment" | "deliveryFeeCents" | "discountCents" | "totalCents" | "paymentMethod">
  locale: string
  messages: UiMessages
}

/**
 * The order as the shop sends it back to its customer: a greeting by name, one line per item as
 * the storefront's message writes them, how it leaves, the total, the payment and where it stands.
 */
export function shopOrderMessageOf({ shopName, order, locale, messages }: ShopOrderMessageInput): string {
  const text = messages.orders.detail
  const money = (cents: number) => formatCents(cents, locale, "BRL")
  const lines = order.items.map((item) =>
    format(text.whatsappLine, {
      qty: String(item.quantity),
      name: item.variantLabel ? `${item.productName} (${item.variantLabel})` : item.productName,
      total: money(item.lineTotalCents),
    }),
  )

  return [
    format(text.whatsappGreeting, { name: order.customer.name, shop: shopName, number: String(order.number) }),
    "",
    ...lines,
    "",
    order.fulfillment === "DELIVERY" ? format(text.whatsappFee, { value: money(order.deliveryFeeCents) }) : text.whatsappPickup,
    ...(order.discountCents > 0 ? [format(text.whatsappDiscount, { value: money(order.discountCents) })] : []),
    format(text.whatsappTotal, { value: money(order.totalCents) }),
    format(text.whatsappPayment, { value: messages.orders.payments[order.paymentMethod] }),
    format(text.whatsappStatus, { value: messages.orders.statuses[order.status] }),
  ].join("\n")
}

/** `wa.me/<digits>?text=…`: the shop's number as it is stored, the message escaped whole. */
export function whatsappOrderHref(digits: string, message: string): string {
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}
