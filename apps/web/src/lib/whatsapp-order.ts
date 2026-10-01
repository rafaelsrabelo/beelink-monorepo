// UI
import { discountLinesOf, type DiscountParts } from "@harness-monorepo/ui/lib/order-discounts"
import { customerTotalText, feeLineOf } from "@harness-monorepo/ui/lib/order-total"
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { CustomerOrder, CustomerProfile, Order } from "@harness-monorepo/contracts"

// App
import { addressLineOf } from "./customer-address"

export interface OrderMessageInput {
  shopName: string
  /** The order as the API placed it: its number, and the lines and total the shop sees in its panel. */
  order: Pick<
    CustomerOrder,
    "number" | "items" | "totalCents" | "deliveryFeeCents" | "fulfillment" | "deliveryAddress" | "paymentMethod" | "discountCents" | "promotionDiscountCents" | "couponDiscountCents" | "coupon"
  >
  /** Who placed it, as the shop keeps them: their name and phone go under the total. */
  customer: Pick<CustomerProfile, "name" | "phone">
  locale: string
  messages: UiMessages
}

/**
 * What came off an order, a line each, between the items and the total (BEELINK-194): without them
 * the lines — at the catalogue's price — add up to more than the total under them. The promotion is
 * not named: in a message its row reads "Promoção: − R$ 25,00", and a name would be a second colon.
 */
function discountMessageLines(order: DiscountParts, money: (cents: number) => string, text: UiMessages["orders"]["discountRows"]): string[] {
  return discountLinesOf({ ...order, items: undefined }, money, text).map(({ label, value }) => format(text.line, { label, value }))
}

/**
 * The order as the shop reads it on WhatsApp once it is placed: its number — the same the panel
 * shows — one line per item as the API priced it, what came off, the total, where it goes or that
 * it is picked up, the payment, and who ordered.
 */
export function orderMessageOf({ shopName, order, customer, locale, messages }: OrderMessageInput): string {
  const text = messages.storefront
  const money = (cents: number) => formatCents(cents, locale, "BRL")
  const lines = order.items.map((item) =>
    format(text.orderLine, {
      qty: String(item.quantity),
      name: item.variantLabel ? `${item.productName} (${item.variantLabel})` : item.productName,
      total: money(item.lineTotalCents),
    }),
  )
  const address = order.deliveryAddress ? addressLineOf(order.deliveryAddress) : null

  return [
    format(text.orderGreeting, { number: String(order.number), shop: shopName }),
    "",
    ...lines,
    "",
    ...discountMessageLines(order, money, messages.orders.discountRows),
    // A delivery's fee not agreed yet stays out of the total: "+ frete" says so (BEELINK-170).
    format(text.orderTotal, { total: customerTotalText(money(order.totalCents), order, text.orderTotalPlusFee) }),
    order.fulfillment === "PICKUP" ? text.orderPickup : format(text.orderAddress, { address: address ?? "" }),
    format(text.orderPayment, { method: messages.orders.payments[order.paymentMethod] }),
    format(text.orderCustomer, { name: customer.name }),
    ...(customer.phone ? [format(text.orderPhone, { phone: customer.phone })] : []),
  ].join("\n")
}

export interface ShopOrderMessageInput {
  shopName: string
  order: Pick<
    Order,
    "number" | "status" | "customer" | "items" | "fulfillment" | "deliveryFeeCents" | "discountCents" | "promotionDiscountCents" | "couponDiscountCents" | "coupon" | "totalCents" | "paymentMethod"
  >
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
  const fee = feeLineOf(order)
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
    ...(order.fulfillment === "PICKUP"
      ? [text.whatsappPickup]
      : fee === "toAgree"
        ? [text.whatsappFeeToAgree]
        : fee
          ? [format(text.whatsappFee, { value: money(fee.cents) })]
          : []),
    ...discountMessageLines(order, money, messages.orders.discountRows),
    // To the customer: a free-delivery coupon makes the total final, whatever fee is agreed.
    format(text.whatsappTotal, { value: customerTotalText(money(order.totalCents), order, messages.orders.totalPlusFee) }),
    format(text.whatsappPayment, { value: messages.orders.payments[order.paymentMethod] }),
    format(text.whatsappStatus, { value: messages.orders.statuses[order.status] }),
  ].join("\n")
}

/** `wa.me/<digits>?text=…`: a number as it is stored — the shop's or a customer's — the message escaped whole. */
export function whatsappOrderHref(digits: string, message: string): string {
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}
