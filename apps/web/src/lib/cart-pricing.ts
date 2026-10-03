// Types
import type { CustomerOrderQuotePayload, CustomerProfile, OrderFulfillment, OrderQuote, OrderShippingChoice, QuotedFirstPurchase, ShippingQuote } from "@harness-monorepo/contracts"
import type { StorefrontCartOffer } from "@harness-monorepo/ui/blocks/storefront/storefront-cart"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"
import { ratePercentOf } from "@harness-monorepo/ui/lib/cashback"
import { discountLinesOf, type DiscountLine } from "@harness-monorepo/ui/lib/order-discounts"
import { customerTotalText } from "@harness-monorepo/ui/lib/order-total"
import { format } from "@harness-monorepo/ui/locales/index"

// App
import { orderItemsOf, rowKeyOf, type CartRow, type CartView } from "./cart-view"
import { checkoutAddressesOf } from "./saved-address"

/** What else the price of a cart depends on, besides its lines, how it leaves and the coupon. */
export interface CartQuoteExtras {
  addressId?: string | null
  shipping?: OrderShippingChoice | null
  useCashback?: boolean
}

/**
 * The cart as its price is asked for (BEELINK-194): what can be ordered now, how it would leave, the
 * saved address a delivery would go to (BEELINK-178), the carrier it would go by when one was picked
 * (BEELINK-186), the coupon typed and whether the shopper's cashback pays for it (BEELINK-244). The
 * lines are sorted, so one cart is one question however its lines were added — the page that served
 * the first price and the browser that follows it ask the same one.
 */
export function cartQuoteOf(
  rows: readonly CartRow[],
  fulfillment: OrderFulfillment,
  couponCode: string | null,
  { addressId = null, shipping = null, useCashback = false }: CartQuoteExtras = {},
): CustomerOrderQuotePayload {
  const items = orderItemsOf(rows).sort((a, b) => (a.variantId < b.variantId ? -1 : a.variantId > b.variantId ? 1 : 0))
  return {
    items,
    fulfillment,
    ...(addressId ? { addressId } : {}),
    ...(shipping ? { shipping } : {}),
    ...(couponCode ? { couponCode } : {}),
    ...(useCashback ? { useCashback } : {}),
  }
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

/**
 * The price the page was served with, who it was priced for and the question it answers: the browser
 * starts from it rather than ask again.
 */
export interface ServedQuote {
  /** Whose price it is (BEELINK-245): the signed-in shopper's id; null is a visitor's, which is anyone's. */
  shopperId: string | null
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
  /** The delivery's fee as the shop's rules quote it (BEELINK-178), in words; null on a pick-up and on a fee agreed afterwards. */
  delivery: string | null
  /** The fee itself, as the order is sent with it: null for one agreed afterwards. Undefined while the cart has no price. */
  deliveryFeeCents: number | null | undefined
  /** The shop's ways to get the cart to the address asked about; null with no address, or no price yet. */
  shipping: ShippingQuote | null
  /** What is left to pay, in words; null with nothing taken off or added, when the subtotal already says it. */
  total: string | null
  /** By the row's key. A row with no entry reads as the shelf prices it. */
  lines: ReadonlyMap<string, PricedCartLine>
  /** A first-purchase promotion the cart would get and did not (BEELINK-245): in none of the amounts above. Null with none. */
  offer: StorefrontCartOffer | null
  /** What the order would earn in cashback, or what is missing to earn it (BEELINK-243), in words. Null while the shop's is off. */
  cashback: string | null
}

/** The shopper's cashback against this cart (BEELINK-244), as the last price said it. */
export interface CartCreditHandle {
  /** What they can spend now. */
  balanceCents: number
  /** The most this cart takes of it. */
  maxCents: number
  /** The cart has nothing credit may pay for. */
  nothingToPay: boolean
  /** "Usar meu cashback" is ticked. */
  checked: boolean
  toggle: (checked: boolean) => void
}

export interface CartPricingContext {
  fulfillment: OrderFulfillment
  locale: string
  messages: UiMessages
}

/**
 * What the cart would earn in cashback, as the quote worked it out; below the shop's minimum, what is
 * missing. A visitor's cart is priced without the first-purchase promotion they may get once
 * identified, which can only lower it: theirs is said as "up to".
 */
function cashbackOf(quote: OrderQuote, money: (cents: number) => string, locale: string, text: UiMessages["storefront"]): string | null {
  const cashback = quote.cashback
  if (!cashback) return null
  if (cashback.status === "EARNS") return format(quote.firstPurchase?.status === "UNIDENTIFIED" ? text.cartCashbackEarnsUpTo : text.cartCashbackEarns, { amount: money(cashback.earnedCents) })
  return format(text.cartCashbackMissing, { amount: money(cashback.missingCents), rate: ratePercentOf(cashback.rateBps, locale) })
}

/**
 * A first-purchase promotion left out of the price, as the cart says it: to a visitor, what it would
 * take off once they are identified; to a customer who has bought before, that it is not theirs.
 * Several at once have no one name, and are said without it.
 */
function offerOf(firstPurchase: QuotedFirstPurchase | null, money: (cents: number) => string, text: UiMessages["storefront"]): StorefrontCartOffer | null {
  if (!firstPurchase) return null

  const name = firstPurchase.promotionName
  if (firstPurchase.status === "NOT_FIRST") return { tone: "closed", text: name ? format(text.cartFirstPurchaseClosed, { name }) : text.cartFirstPurchaseClosedUnnamed }

  const value = money(firstPurchase.discountCents)
  return { tone: "open", text: name ? format(text.cartFirstPurchaseOpen, { name, value }) : format(text.cartFirstPurchaseOpenUnnamed, { value }) }
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
  if (!quote) return { subtotalCents: view.subtotalCents, discounts: [], delivery: null, deliveryFeeCents: undefined, shipping: null, total: null, lines: new Map(), offer: null, cashback: null }

  const money = (cents: number) => formatCents(cents, locale, "BRL")
  const coupon = quote.coupon?.status === "APPLIED" ? { code: quote.coupon.code, kind: quote.coupon.kind } : null
  const discounts = discountLinesOf(
    {
      discountCents: quote.discountCents,
      promotionDiscountCents: quote.promotionDiscountCents,
      couponDiscountCents: quote.couponDiscountCents,
      coupon,
      items: quote.lines.map((line) => ({ discountCents: line.discountCents, promotionName: line.promotion?.name ?? null })),
      cashbackUsedCents: quote.cashbackUse?.appliedCents,
    },
    money,
    messages.orders.discountRows,
  )
  const fee = fulfillment === "DELIVERY" ? quote.deliveryFeeCents : null
  const delivery = fee === null ? null : fee === 0 ? messages.storefront.cartDeliveryFree : money(fee)
  const total = discounts.length || delivery
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

  return { subtotalCents: quote.subtotalCents, discounts, delivery, deliveryFeeCents: fulfillment === "DELIVERY" ? quote.deliveryFeeCents : undefined, shipping: quote.shipping, total, lines, offer: offerOf(quote.firstPurchase, money, messages.storefront), cashback: cashbackOf(quote, money, locale, messages.storefront) }
}
