// Types
import type { Coupon, CouponRedemption, CouponStatus, Promotion, PromotionStatus } from "@harness-monorepo/contracts"
import type { CouponListRow } from "@harness-monorepo/ui/blocks/promotions/coupon-list"
import type { CouponRedemptionRow } from "@harness-monorepo/ui/blocks/promotions/coupon-redemptions"
import type { PromotionListRow } from "@harness-monorepo/ui/blocks/promotions/promotion-list"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { format } from "@harness-monorepo/ui/locales/index"

// App
import { shopMomentOf } from "@/lib/shop-time"

/** The two lists' address, in the panel's own words: `situacao` and `pagina`. */
export const DISCOUNT_KEYS = { status: "situacao", page: "pagina" } as const

/** A promotion is "ativa", a coupon "ativo": each list spells its statuses in its own gender. */
const PROMOTION_WORDS = { ativas: "ACTIVE", agendadas: "SCHEDULED", pausadas: "PAUSED", encerradas: "ENDED" } as const satisfies Record<string, PromotionStatus>
const COUPON_WORDS = { ativos: "ACTIVE", agendados: "SCHEDULED", pausados: "PAUSED", encerrados: "ENDED", esgotados: "EXHAUSTED" } as const satisfies Record<string, CouponStatus>

/** The API's own page ceiling (`DISCOUNTS_PAGE_MAX`): past it the read is refused. */
const PAGE_MAX = 10_000

export interface DiscountAddress<S extends string> {
  status: S | undefined
  page: number
}

function addressOf<S extends string>(search: Pick<URLSearchParams, "get">, words: Record<string, S>): DiscountAddress<S> {
  const word = search.get(DISCOUNT_KEYS.status) ?? ""
  const page = Number(search.get(DISCOUNT_KEYS.page))
  return { status: Object.hasOwn(words, word) ? words[word] : undefined, page: Number.isInteger(page) && page > 1 ? Math.min(page, PAGE_MAX) : 1 }
}

/** The address with `next` applied; a changed status starts at page one, and defaults stay out. */
function hrefOf<S extends string>(path: string, words: Record<string, S>, address: DiscountAddress<S>, next: Partial<DiscountAddress<S>>): string {
  const merged = { ...address, ...next, page: "page" in next ? (next.page ?? 1) : 1 }
  const search = new URLSearchParams()
  const word = Object.keys(words).find((key) => words[key] === merged.status)
  if (word) search.set(DISCOUNT_KEYS.status, word)
  if (merged.page > 1) search.set(DISCOUNT_KEYS.page, String(merged.page))
  return `${path}${search.size ? `?${search.toString()}` : ""}`
}

/** What the address says; an unknown status is none, and a bad page the first. */
export const promotionsAddressOf = (search: Pick<URLSearchParams, "get">): DiscountAddress<PromotionStatus> => addressOf(search, PROMOTION_WORDS)
export const couponsAddressOf = (search: Pick<URLSearchParams, "get">): DiscountAddress<CouponStatus> => addressOf(search, COUPON_WORDS)

export function promotionsHrefOf(slug: string, address: DiscountAddress<PromotionStatus>, next: Partial<DiscountAddress<PromotionStatus>>): string {
  return hrefOf(`/admin/${slug}/promotions`, PROMOTION_WORDS, address, next)
}

export function couponsHrefOf(slug: string, address: DiscountAddress<CouponStatus>, next: Partial<DiscountAddress<CouponStatus>>): string {
  return hrefOf(`/admin/${slug}/coupons`, COUPON_WORDS, address, next)
}

/** What the API is asked, from the address. */
export function discountQueryOf<S extends string>(address: DiscountAddress<S>): { status?: S; page?: number } {
  return { ...(address.status ? { status: address.status } : {}), ...(address.page > 1 ? { page: address.page } : {}) }
}

/** "12,5%" to a Brazilian reader and "12.5%" to an English one: the list is read, not typed back. */
function percentOf(bps: number | null, locale: string): string {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format((bps ?? 0) / 100)}%`
}

function moneyOf(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(cents / 100)
}

interface Text {
  locale: string
  messages: UiMessages
}

function periodOf(startsAt: string, endsAt: string | null, { locale, messages }: Text): string {
  const from = shopMomentOf(startsAt, locale)
  return endsAt ? format(messages.discounts.periodFromTo, { from, to: shopMomentOf(endsAt, locale) }) : format(messages.discounts.periodFrom, { from })
}

/** "10% em 3 produtos": the discount, then where it applies. A fixed amount off named products is said per unit. */
function promotionSummaryOf(promotion: Promotion, { locale, messages }: Text): string {
  const text = messages.discounts.promotions
  const amount = moneyOf(promotion.amountCents ?? 0, locale)
  const discount = promotion.discountKind === "PERCENT" ? percentOf(promotion.percentBps, locale) : promotion.scope === "CART" ? amount : format(text.perUnit, { amount })
  if (promotion.scope === "CART") return format(text.summaryCart, { discount })

  const count = promotion.scope === "PRODUCTS" ? promotion.products.length : promotion.categories.length
  if (count === 0) return format(text.summaryNothing, { discount })
  const sentence = promotion.scope === "PRODUCTS" ? (count === 1 ? text.summaryProductsOne : text.summaryProducts) : count === 1 ? text.summaryCategoriesOne : text.summaryCategories
  return format(sentence, { discount, count: String(count) })
}

export function promotionRowsOf(promotions: readonly Promotion[], text: Text): PromotionListRow[] {
  return promotions.map((promotion) => ({
    id: promotion.id,
    name: promotion.name,
    summary: promotionSummaryOf(promotion, text),
    period: periodOf(promotion.startsAt, promotion.endsAt, text),
    status: promotion.status,
    active: promotion.active,
    audience: promotion.audience,
  }))
}

/** "3 de 100 usos" under a limit; the bare count without one. */
function usesOf(coupon: Coupon, messages: UiMessages): string {
  const text = messages.discounts.coupons
  if (coupon.maxUses !== null) return format(text.usesOf, { used: String(coupon.usedCount), max: String(coupon.maxUses) })
  return coupon.usedCount === 0 ? text.usesNone : coupon.usedCount === 1 ? text.usesOne : format(text.uses, { count: String(coupon.usedCount) })
}

export function couponRowsOf(coupons: readonly Coupon[], text: Text): CouponListRow[] {
  const words = text.messages.discounts.coupons
  return coupons.map((coupon) => ({
    id: coupon.id,
    code: coupon.code,
    discount: coupon.kind === "FREE_SHIPPING" ? words.freeShipping : coupon.kind === "PERCENT" ? percentOf(coupon.percentBps, text.locale) : moneyOf(coupon.amountCents ?? 0, text.locale),
    minimum: coupon.minSubtotalCents > 0 ? format(words.minimum, { amount: moneyOf(coupon.minSubtotalCents, text.locale) }) : null,
    period: periodOf(coupon.startsAt, coupon.endsAt, text),
    uses: usesOf(coupon, text.messages),
    status: coupon.status,
    active: coupon.active,
    audience: coupon.audience,
  }))
}

export function redemptionRowsOf(redemptions: readonly CouponRedemption[], slug: string, locale: string): CouponRedemptionRow[] {
  return redemptions.map((use) => ({
    id: use.id,
    orderNumber: use.order.number,
    orderHref: `/admin/${slug}/orders/${use.order.number}`,
    customerName: use.customer.name,
    date: shopMomentOf(use.redeemedAt, locale),
    discount: moneyOf(use.discountCents, locale),
    cancelled: use.order.status === "CANCELLED",
  }))
}
