// Types
import type { Order } from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"
import { orderPaymentStateOf } from "@harness-monorepo/ui/lib/order-payment"
import { orderTotalText } from "@harness-monorepo/ui/lib/order-total"
import { format } from "@harness-monorepo/ui/locales/index"

// App
import { addressLineOf } from "./customer-address"

export interface CourierMessageInput {
  shopName: string
  order: Order
  locale: string
  messages: UiMessages
}

/**
 * What the shop's own courier is sent (plan 2026-11-10--modo-gestor): where, for whom, what goes —
 * a kit with what was chosen for it — and whether there is money to collect. Null for an order
 * with no address to go to: a pick-up, or a delivery that recorded none.
 */
export function courierMessageOf({ shopName, order, locale, messages }: CourierMessageInput): string | null {
  const address = order.deliveryAddress ? addressLineOf(order.deliveryAddress) : null
  if (order.fulfillment !== "DELIVERY" || !address) return null

  const text = messages.gestor.courierMessage
  const name = (product: string, variant: string | null) => (variant ? `${product} (${variant})` : product)
  const items = order.items.flatMap((item) => [
    `- ${format(text.item, { quantity: String(item.quantity), name: name(item.productName, item.variantLabel) })}`,
    ...(item.kitParts ?? []).map((part) => `   · ${format(text.item, { quantity: String(part.quantity), name: name(part.productName, part.variantLabel) })}`),
  ])
  const total = orderTotalText(formatCents(order.totalCents, locale, "BRL"), order, messages.orders.totalPlusFee)
  const state = orderPaymentStateOf(order)
  const payment =
    order.paymentChannel === "OFFLINE" ? format(text.collect, { total, method: messages.orders.payments[order.paymentMethod] }) : state === "paid" ? text.paid : text.unpaidOnline

  return [
    format(text.heading, { shop: shopName, number: String(order.number) }),
    format(text.customer, { name: order.deliveryAddress?.recipientName ?? order.customer.name }),
    ...(order.customer.phone ? [format(text.phone, { phone: `+${order.customer.phone}` })] : []),
    format(text.address, { address }),
    "",
    text.items,
    ...items,
    "",
    payment,
    ...(order.note ? [format(text.note, { note: order.note })] : []),
  ].join("\n")
}

/** `wa.me/?text=…`: WhatsApp with the message written and no one chosen — the shopkeeper picks the courier. */
export function whatsappShareHref(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}
