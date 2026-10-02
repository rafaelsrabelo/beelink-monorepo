// Types
import type { CreateOrderPayload, OrderFulfillment, OrderQuote, PaymentMethod, Product, ProductDetail, ShopOrderQuotePayload } from "@harness-monorepo/contracts"
import type { OrderDetailsValues, OrderFormLine, OrderProductOption, OrderTotals, OrderTotalsRefusal, OrderVariantOption } from "@harness-monorepo/ui/lib/order-form"

// UI
import { centsFrom } from "@harness-monorepo/ui/lib/money"

export function productOptionOf(product: Product): OrderProductOption {
  return { id: product.id, name: product.name, imageUrl: product.imageUrl, priceCents: product.priceCents, sku: product.sku }
}

/** The combinations the shop sells, labelled as the API photographs them: "Sabor: Uva · Peso: 300 g". */
export function variantOptionsOf(product: ProductDetail): OrderVariantOption[] {
  return product.variants
    .filter((variant) => variant.isActive)
    .map((variant) => {
      const chosen = product.options.flatMap((option) => {
        const value = option.values.find((candidate) => variant.optionValueIds.includes(candidate.id))
        return value ? [`${option.name}: ${value.name}`] : []
      })
      return {
        id: variant.id,
        label: chosen.length ? chosen.join(" · ") : null,
        priceCents: variant.priceCents,
        sku: variant.sku,
        outOfStock: variant.trackStock && (variant.stockQuantity ?? 0) <= 0,
        available: variant.trackStock ? Math.max(variant.stockQuantity ?? 0, 0) : null,
      }
    })
}

/**
 * A phone as the API keeps it, to look up the customer it said already has it: digits, the
 * long-distance 0 and a carrier code dropped, and 55 in front of a Brazilian number typed without
 * it — the rule of the API's `normaliseWhatsapp`, which a 409 cannot hand back.
 */
export function canonicalPhoneOf(typed: string): string {
  const digits = typed.replace(/\D/g, "").replace(/^0(?:\d{2})?(?=\d{10,11}$)/, "")
  return digits.length === 10 || digits.length === 11 ? `55${digits}` : digits
}

/** Money as typed: empty is zero, anything unreadable is null for the field to point at. */
export function moneyOf(typed: string): number | null {
  return typed.trim() === "" ? 0 : centsFrom(typed)
}

export interface OrderPayloadInput {
  customerId: string
  lines: readonly OrderFormLine[]
  details: OrderDetailsValues
  paymentMethod: PaymentMethod
  /** What the summary showed: its fee and discount are the ones sent. */
  totals: OrderTotals
  /** The customer's credit the sale was priced with (BEELINK-244), as the quote applied it; zero spends none. */
  cashbackCents?: number
  /** `yyyy-mm-dd`, the shopkeeper's today. */
  today: string
}

export interface SaleInput {
  /** Whose sale it is, once chosen; null before. A first-purchase promotion and a coupon's limit per customer are theirs. */
  customerId: string | null
  lines: readonly OrderFormLine[]
  fulfillment: OrderFulfillment
  /** Whole cents, as typed: zero is left out. */
  deliveryFeeCents: number
  discountCents: number
  /** `yyyy-mm-dd`; empty is today. */
  placedOn: string
  /** `yyyy-mm-dd`, the shopkeeper's today. */
  today: string
  /** Price it with the most of the chosen customer's credit it takes (BEELINK-244). Asked of the price alone: the order names the amount. */
  useCashback?: boolean
}

/**
 * What prices a sale, as the API takes it — for the price asked before it is registered and for the
 * order itself, so the two cannot be asked differently: the customer by id once chosen, no prices,
 * zero amounts left out. Today is left to the API's clock; a day past is sent at its noon, so no
 * time zone moves it a day.
 *
 * The customer is part of the price (BEELINK-245): without them the API cannot apply a first-purchase
 * promotion it applies once the order names them, and the summary would show another total.
 */
export function saleOf(input: SaleInput & { customerId: string }): ShopOrderQuotePayload & Pick<CreateOrderPayload, "customer">
export function saleOf(input: SaleInput): ShopOrderQuotePayload
export function saleOf({ customerId, lines, fulfillment, deliveryFeeCents, discountCents, placedOn, today, useCashback = false }: SaleInput): ShopOrderQuotePayload {
  const day = placedOn || today

  return {
    ...(customerId ? { customer: { id: customerId } } : {}),
    items: lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
    fulfillment,
    ...(deliveryFeeCents ? { deliveryFeeCents } : {}),
    ...(discountCents ? { discountCents } : {}),
    ...(day && day !== today ? { placedAt: new Date(`${day}T12:00:00`).toISOString() } : {}),
    // Credit is somebody's: without a customer there is none to ask about.
    ...(useCashback && customerId ? { useCashback: true } : {}),
  }
}

/**
 * The order as the API takes it: what prices the sale — its customer among it — how it is paid and
 * what was said. Of the customer's credit it carries the amount quoted, never "the most": the API
 * refuses the order rather than write it at another price than the summary showed.
 */
export function orderPayloadOf({ customerId, lines, details, paymentMethod, totals, cashbackCents = 0, today }: OrderPayloadInput): CreateOrderPayload {
  const note = details.note.trim()

  return {
    ...saleOf({ customerId, lines, fulfillment: details.fulfillment, deliveryFeeCents: totals.deliveryFeeCents, discountCents: totals.discountCents, placedOn: details.placedOn, today }),
    paymentMethod,
    ...(cashbackCents > 0 ? { cashbackCents } : {}),
    ...(note ? { note } : {}),
  }
}

/** The chosen customer's credit as the summary offers it: what they have, and the most this sale takes when that is less. */
export interface CashbackOffer {
  balanceCents: number
  cappedCents: number | null
}

/**
 * Whether the summary offers the customer's cashback (BEELINK-244), read from the sale's own price:
 * only to a customer with credit, on a sale that takes some of it. Once ticked the box stays while
 * the sale takes none — a discount typed since took it all — or there would be nothing left to untick.
 */
export function cashbackOfferOf(quote: OrderQuote | null, ticked: boolean): CashbackOffer | null {
  const use = quote?.cashbackUse
  if (!use || use.balanceCents <= 0 || (use.maxCents <= 0 && !ticked)) return null
  return { balanceCents: use.balanceCents, cappedCents: use.maxCents < use.balanceCents ? use.maxCents : null }
}

/**
 * What the summary shows (BEELINK-194): the API's own pricing of the sale once it answered — a
 * promotion running on the day it is dated is in it, which the form's sum cannot know — and the
 * form's sum until then. A refusal is said either way: the form's own, before anything is asked, or
 * the API's, which holds the typed discount against what the promotions left.
 */
export function shownTotalsOf(own: OrderTotals | OrderTotalsRefusal, quote: OrderQuote | null, refusedAs: string | null): OrderTotals | OrderTotalsRefusal {
  if (typeof own === "string") return own
  if (refusedAs === "ORDER_DISCOUNT_TOO_LARGE") return "DISCOUNT_TOO_LARGE"
  if (refusedAs === "ORDER_TOTAL_TOO_LARGE") return "TOTAL_TOO_LARGE"
  if (!quote) return own

  return {
    subtotalCents: quote.subtotalCents,
    // The panel always tells a fee: a delivery's is the amount typed, never "to be agreed".
    deliveryFeeCents: quote.deliveryFeeCents ?? 0,
    discountCents: quote.manualDiscountCents,
    totalCents: quote.totalCents,
    priced: quote.lines.map((line) => ({ discountCents: line.discountCents, promotionName: line.promotion?.name ?? null })),
    // Out of the API's total already: its row says where the difference went.
    cashbackUsedCents: quote.cashbackUse?.appliedCents || undefined,
  }
}
