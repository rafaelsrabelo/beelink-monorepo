// Locales
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { CouponKindValue } from "./order-discounts"

/** Mirrors the wire's `OfferBenefit`, less its end; this package imports no contracts. */
export interface OfferBenefitValue {
  kind: CouponKindValue
  /** Basis points, on a `PERCENT`. */
  percentBps: number | null
  /** Whole cents, on a `FIXED`. */
  amountCents: number | null
  /** What the products have to add up to; zero asks for none. */
  minSubtotalCents: number
}

type Text = UiMessages["storefront"]["offers"]

function money(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(cents / 100)
}

/** "10%" or "R$ 15,00": the benefit's own number, as its reader writes it. Null on a free delivery, which has none. */
function valueOf(benefit: OfferBenefitValue, locale: string): string | null {
  if (benefit.kind === "PERCENT") return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 2 }).format((benefit.percentBps ?? 0) / 10_000)
  return benefit.kind === "FIXED" ? money(benefit.amountCents ?? 0, locale) : null
}

/**
 * What an offer gives, in words built from the API's numbers and nothing else — "10% de desconto",
 * "R$ 15,00 de desconto", "frete grátis". `inline` goes inside a sentence; `row` stands as a line of
 * its own, capitalised.
 */
export function offerBenefitWords(benefit: OfferBenefitValue, locale: string, text: Text, form: "inline" | "row" = "inline"): string {
  const value = valueOf(benefit, locale)
  if (value === null) return form === "row" ? text.cartBenefitFreeShipping : text.benefitFreeShipping
  return format(form === "row" ? text.cartBenefitDiscount : text.benefitDiscount, { value })
}

/** "Em compras a partir de R$ 50,00." — a sentence of its own; null when the offer asks for no minimum. */
export function offerMinimumSentence(benefit: OfferBenefitValue, locale: string, text: Text): string | null {
  return benefit.minSubtotalCents > 0 ? format(text.minimum, { amount: money(benefit.minSubtotalCents, locale) }) : null
}

/** One row of the cart's "Cupons disponíveis", as the block draws it. */
export interface CartCouponRow {
  code: string
  /** "10% de desconto". */
  benefit: string
  /** What it asks for, each a short line: its minimum, that it is for a first order. */
  conditions: string[]
  /** "Faltam R$ 60,00 em produtos para usar."; null when applying it now is taken. */
  missing: string | null
}

/** Mirrors the wire's `OfferedCoupon`. */
export interface OfferedCouponValue extends OfferBenefitValue {
  code: string
  audience: "EVERYONE" | "FIRST_PURCHASE"
  missingCents: number
}

/**
 * The one coupon the cart calls its customer to (BEELINK-311), among those the API listed for this
 * cart: only one that applying now is taken — never one short of its minimum — and, of those, the
 * first-order coupon when there is one, else the first of the list, which is the newest. Not "the
 * one that takes the most off": the list says what a coupon is, not what it is worth on this cart.
 */
export function highlightedCouponOf<Coupon extends OfferedCouponValue>(coupons: readonly Coupon[]): Coupon | null {
  const usable = coupons.filter((coupon) => coupon.missingCents === 0)
  return usable.find((coupon) => coupon.audience === "FIRST_PURCHASE") ?? usable[0] ?? null
}

/** The cart's call, as its block draws it: a sentence that ends where the code goes, and the code. */
export interface CartCouponCall {
  /** "Você tem 15% de desconto no primeiro pedido com o cupom". */
  message: string
  code: string
}

/** The call to the highlighted coupon, in words built from the API's numbers; null with none to call to. */
export function cartCouponCallOf(coupons: readonly OfferedCouponValue[], locale: string, text: Text): CartCouponCall | null {
  const coupon = highlightedCouponOf(coupons)
  if (!coupon) return null
  return { message: format(coupon.audience === "FIRST_PURCHASE" ? text.cartCallFirstOrder : text.cartCall, { benefit: offerBenefitWords(coupon, locale, text) }), code: coupon.code }
}

/** The cart's coupons as rows, in the API's order: every amount in them is one it sent. */
export function cartCouponRowsOf(coupons: readonly OfferedCouponValue[], locale: string, text: Text): CartCouponRow[] {
  return coupons.map((coupon) => ({
    code: coupon.code,
    benefit: offerBenefitWords(coupon, locale, text, "row"),
    conditions: [
      ...(coupon.minSubtotalCents > 0 ? [format(text.cartMinimum, { amount: money(coupon.minSubtotalCents, locale) })] : []),
      ...(coupon.audience === "FIRST_PURCHASE" ? [text.cartFirstPurchase] : []),
    ],
    missing: coupon.missingCents > 0 ? format(text.cartMissing, { amount: money(coupon.missingCents, locale) }) : null,
  }))
}
