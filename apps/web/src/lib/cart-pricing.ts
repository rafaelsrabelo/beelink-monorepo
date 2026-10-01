// Types
import type { CustomerOrderQuotePayload, CustomerProfile, OrderFulfillment, OrderQuote } from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"
import { discountLinesOf, type DiscountLine } from "@harness-monorepo/ui/lib/order-discounts"
import { customerTotalText } from "@harness-monorepo/ui/lib/order-total"

// App
import { orderItemsOf, rowKeyOf, type CartRow, type CartView } from "./cart-view"
import { checkoutAddressesOf } from "./saved-address"

/**
 * The cart as its price is asked for (BEELINK-194): what can be ordered now, how it would leave and
 * the coupon typed. The lines are sorted, so one cart is one question however its lines were added
 * — the page that served the first price and the browser that follows it ask the same one.
 */
export function cartQuoteOf(rows: readonly CartRow[], fulfillment: OrderFulfillment, couponCode: string | null): CustomerOrderQuotePayload {
  const items = orderItemsOf(rows).sort((a, b) => (a.variantId < b.variantId ? -1 : a.variantId > b.variantId ? 1 : 0))
  return { items, fulfillment, ...(couponCode ? { couponCode } : {}) }
}

/** Whether two questions are the same one. Both come from `cartQuoteOf`, so their fields are in one order. */
export function sameCart(one: CustomerOrderQuotePayload, other: CustomerOrderQuotePayload): boolean {
  return JSON.stringify(one) === JSON.stringify(other)
}

/**
 * How the cart leaves before the shopper chose: a delivery when they have somewhere to deliver, a
 * pick-up otherwise — a visitor included, who chooses once they are signed in.
 */
export function firstFulfillmentOf(shopper: Pick<CustomerProfile, "name" | "addresses"> | null): OrderFulfillment {
  return shopper && checkoutAddressesOf(shopper).length ? "DELIVERY" : "PICKUP"
}

/** The price the page was served with, and the question it answers: the browser starts from it rather than ask again. */
export interface ServedQuote {
  cart: CustomerOrderQuotePayload
  quote: OrderQuote
  /** When it was priced, in epoch milliseconds: it ages from then, not from when the page reached the browser. */
  at: number
}

/** One row of the cart as the API priced its line. */
export interface PricedCartLine {
  lineTotalCents: number
  /** What it cost before the promotion; null when none took anything off it. */
  wasCents: number | null
  promotion: string | null
}

export interface CartPricing {
  /** The products before any promotion; the shelf's own sum while the cart has no price from the API. */
  subtotalCents: number
  discounts: DiscountLine[]
  /** What is left to pay, in words; null with nothing taken off, when the subtotal already says it. */
  total: string | null
  /** By the row's key. A row with no entry reads as the shelf prices it. */
  lines: ReadonlyMap<string, PricedCartLine>
}

export interface CartPricingContext {
  fulfillment: OrderFulfillment
  locale: string
  messages: UiMessages
}

/**
 * The summary and the lines as the cart draws them, from the API's price of it. Without one — it is
 * still being asked, or the API could not answer — the cart reads as the shelf prices it: one
 * subtotal and no row of discount, which is what it showed before there was a price to ask for.
 *
 * `quote` may be the price of the cart a moment ago, kept on screen while the new one is asked: a
 * line whose quantity moved since is priced from the catalogue's own numbers, so its total follows
 * the stepper at once instead of waiting for the answer.
 */
export function cartPricingOf(quote: OrderQuote | null, view: CartView, { fulfillment, locale, messages }: CartPricingContext): CartPricing {
  if (!quote) return { subtotalCents: view.subtotalCents, discounts: [], total: null, lines: new Map() }

  const money = (cents: number) => formatCents(cents, locale, "BRL")
  const coupon = quote.coupon?.status === "APPLIED" ? { code: quote.coupon.code, kind: quote.coupon.kind } : null
  const discounts = discountLinesOf(
    {
      discountCents: quote.discountCents,
      promotionDiscountCents: quote.promotionDiscountCents,
      couponDiscountCents: quote.couponDiscountCents,
      coupon,
      items: quote.lines.map((line) => ({ discountCents: line.discountCents, promotionName: line.promotion?.name ?? null })),
    },
    money,
    messages.orders.discountRows,
  )
  const total = discounts.length
    ? customerTotalText(money(quote.totalCents), { fulfillment, deliveryFeeCents: quote.deliveryFeeCents, coupon }, messages.storefront.orderTotalPlusFee)
    : null

  const orderable = view.rows.filter((row) => row.available)
  const lines = new Map<string, PricedCartLine>()
  for (const line of quote.lines) {
    // Two cookie lines naming one combination are priced as one: neither row can say its own share.
    const [row, ...twins] = orderable.filter((each) => each.orderVariantId === line.variantId)
    if (!row || twins.length || line.discountCents <= 0) continue

    const moved = line.quantity !== row.qty
    const lineTotalCents = moved ? row.lineTotalCents : line.lineTotalCents - line.discountCents
    const before = moved ? line.unitPriceCents * row.qty : line.lineTotalCents
    lines.set(rowKeyOf(row), { lineTotalCents, wasCents: before > lineTotalCents ? before : null, promotion: line.promotion?.name ?? null })
  }

  return { subtotalCents: quote.subtotalCents, discounts, total, lines }
}
