// Types
import type { Coupon, CouponPayload, Promotion, PromotionPayload } from "@harness-monorepo/contracts"
import type { CouponFormIssues, CouponFormValues, HalfTypedDates, PromotionFormIssues, PromotionFormValues } from "@harness-monorepo/ui/lib/discount-form"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { centsFromStrict, reaisFrom } from "@harness-monorepo/ui/lib/money"

// App
import { instantOf, shopInputOf } from "@/lib/shop-time"

/**
 * The crossing between what a promotion's or a coupon's form holds — strings, in the shopkeeper's
 * units — and the wire: basis points, whole cents and instants. One place, both ways, and the place
 * that says which fields to correct before anything is sent. The rules are the API's own
 * (BEELINK-190); saying them here first spares a round trip, and the API still has the last word.
 */

type Issues = UiMessages["discounts"]["issues"]

const PERCENT_BPS_MAX = 10_000
const AMOUNT_MAX_CENTS = 100_000_000
const COUPON_CODE = /^[A-Za-z0-9][A-Za-z0-9_-]{2,29}$/
const WHOLE = /^\d{1,7}$/

/** Basis points as the field shows a percentage: 1000 is "10", 1250 is "12,5". */
export function percentFrom(bps: number | null): string {
  return bps === null ? "" : String(bps / 100).replace(".", ",")
}

/**
 * A percentage typed as a person types it into basis points. It is the money parser on purpose:
 * "12,5" per cent is 1250 hundredths, exactly as "12,50" reais is 1250 cents. The strict one, which
 * refuses what it would have to guess: "1.000" read as one, or "-10" as ten, is a discount nobody set.
 */
function bpsFrom(typed: string): number | null {
  const bps = centsFromStrict(typed)
  return bps !== null && bps >= 1 && bps <= PERCENT_BPS_MAX ? bps : null
}

function amountFrom(typed: string): number | null {
  const cents = centsFromStrict(typed)
  return cents !== null && cents >= 1 && cents <= AMOUNT_MAX_CENTS ? cents : null
}

/** A limit left blank is none; anything else is a whole number of at least one, up to `max`. */
function limitFrom(typed: string, max: number): number | null | "invalid" {
  const trimmed = typed.trim()
  if (trimmed === "") return null
  const limit = WHOLE.test(trimmed) ? Number(trimmed) : 0
  return limit >= 1 && limit <= max ? limit : "invalid"
}

interface PeriodFields {
  startsAt: string
  endsAt: string
}

const NOT_HALF_TYPED: HalfTypedDates = { startsAt: false, endsAt: false }

/** An instant on the calendar the API takes (2000 to 2100): a year typed as "26" is the year 26. */
function momentOf(input: string): string | null {
  const instant = instantOf(input)
  return instant !== null && instant >= "2000-01-01" && instant < "2100-01-01" ? instant : null
}

/**
 * The two instants, or which of the two fields to correct. A field the browser holds half-typed
 * reads as empty: without `halfTyped`, an end with its date and no time would be saved as "never ends".
 */
function periodOf(value: PeriodFields, halfTyped: HalfTypedDates, text: Issues): { startsAt: string; endsAt: string | null; issues: { startsAt?: string; endsAt?: string } } {
  const startsAt = halfTyped.startsAt ? null : momentOf(value.startsAt)
  const blankEnd = value.endsAt === "" && !halfTyped.endsAt
  const endsAt = blankEnd || halfTyped.endsAt ? null : momentOf(value.endsAt)
  const issues: { startsAt?: string; endsAt?: string } = {}
  if (startsAt === null) issues.startsAt = text.date
  if (!blankEnd && endsAt === null) issues.endsAt = text.date
  else if (startsAt !== null && endsAt !== null && endsAt <= startsAt) issues.endsAt = text.endsBeforeStart
  return { startsAt: startsAt ?? "", endsAt, issues }
}

/** A new promotion: a percentage off the whole cart, for everyone, starting now. */
export function emptyPromotion(now: Date): PromotionFormValues {
  return { name: "", scope: "CART", kind: "PERCENT", percent: "", amount: "", audience: "EVERYONE", startsAt: shopInputOf(now), endsAt: "", products: [], categoryIds: [] }
}

export function promotionFormOf(promotion: Promotion): PromotionFormValues {
  return {
    name: promotion.name,
    scope: promotion.scope,
    kind: promotion.discountKind,
    percent: percentFrom(promotion.percentBps),
    amount: reaisFrom(promotion.amountCents),
    audience: promotion.audience,
    startsAt: shopInputOf(promotion.startsAt),
    endsAt: promotion.endsAt ? shopInputOf(promotion.endsAt) : "",
    products: promotion.products.map((product) => ({ id: product.id, name: product.name })),
    categoryIds: promotion.categories.map((category) => category.id),
  }
}

/**
 * What the form sends, or the fields to correct. `active` is left out on purpose: the API keeps
 * the switch as it is, so saving a paused promotion does not put it back on.
 */
export function promotionPayloadOf(value: PromotionFormValues, text: Issues, halfTyped: HalfTypedDates = NOT_HALF_TYPED): { payload: PromotionPayload } | { issues: PromotionFormIssues } {
  const name = value.name.trim()
  const percentBps = value.kind === "PERCENT" ? bpsFrom(value.percent) : null
  const amountCents = value.kind === "FIXED" ? amountFrom(value.amount) : null
  const period = periodOf(value, halfTyped, text)

  const issues: PromotionFormIssues = {
    ...(name === "" ? { name: text.required } : {}),
    ...(value.kind === "PERCENT" && percentBps === null ? { percent: text.percent } : {}),
    ...(value.kind === "FIXED" && amountCents === null ? { amount: text.amount } : {}),
    ...(value.scope === "PRODUCTS" && value.products.length === 0 ? { products: text.products } : {}),
    ...(value.scope === "CATEGORIES" && value.categoryIds.length === 0 ? { categories: text.categories } : {}),
    ...period.issues,
  }
  if (Object.keys(issues).length > 0) return { issues }

  return {
    payload: {
      name,
      scope: value.scope,
      discountKind: value.kind,
      percentBps,
      amountCents,
      audience: value.audience,
      startsAt: period.startsAt,
      endsAt: period.endsAt,
      // Only the list its scope asks for: the other may still hold what was chosen before the scope changed.
      productIds: value.scope === "PRODUCTS" ? value.products.map((product) => product.id) : [],
      categoryIds: value.scope === "CATEGORIES" ? value.categoryIds : [],
    },
  }
}

/** A new coupon: a percentage, for everyone, starting now, with no minimum and no limits — and not shown in the shop. */
export function emptyCoupon(now: Date): CouponFormValues {
  return { code: "", kind: "PERCENT", percent: "", amount: "", minSubtotal: "", audience: "EVERYONE", shownInStore: false, startsAt: shopInputOf(now), endsAt: "", maxUses: "", maxUsesPerCustomer: "" }
}

export function couponFormOf(coupon: Coupon): CouponFormValues {
  return {
    code: coupon.code,
    kind: coupon.kind,
    percent: percentFrom(coupon.percentBps),
    amount: reaisFrom(coupon.amountCents),
    minSubtotal: coupon.minSubtotalCents > 0 ? reaisFrom(coupon.minSubtotalCents) : "",
    audience: coupon.audience,
    shownInStore: coupon.shownInStore,
    startsAt: shopInputOf(coupon.startsAt),
    endsAt: coupon.endsAt ? shopInputOf(coupon.endsAt) : "",
    maxUses: coupon.maxUses === null ? "" : String(coupon.maxUses),
    maxUsesPerCustomer: coupon.maxUsesPerCustomer === null ? "" : String(coupon.maxUsesPerCustomer),
  }
}

/** What the form sends, or the fields to correct; `active` is left out, as on a promotion. */
export function couponPayloadOf(value: CouponFormValues, text: Issues, halfTyped: HalfTypedDates = NOT_HALF_TYPED): { payload: CouponPayload } | { issues: CouponFormIssues } {
  const code = value.code.trim()
  const percentBps = value.kind === "PERCENT" ? bpsFrom(value.percent) : null
  const amountCents = value.kind === "FIXED" ? amountFrom(value.amount) : null
  const minSubtotalCents = value.minSubtotal.trim() === "" ? 0 : centsFromStrict(value.minSubtotal)
  const maxUses = limitFrom(value.maxUses, 1_000_000)
  const maxUsesPerCustomer = limitFrom(value.maxUsesPerCustomer, 1000)
  const period = periodOf(value, halfTyped, text)

  const issues: CouponFormIssues = {
    ...(code === "" ? { code: text.required } : COUPON_CODE.test(code) ? {} : { code: text.code }),
    ...(value.kind === "PERCENT" && percentBps === null ? { percent: text.percent } : {}),
    ...(value.kind === "FIXED" && amountCents === null ? { amount: text.amount } : {}),
    ...(minSubtotalCents === null || minSubtotalCents > AMOUNT_MAX_CENTS ? { minSubtotal: text.amount } : {}),
    ...(maxUses === "invalid" ? { maxUses: text.limit } : {}),
    ...(maxUsesPerCustomer === "invalid" ? { maxUsesPerCustomer: text.limit } : {}),
    ...period.issues,
  }
  if (Object.keys(issues).length > 0 || minSubtotalCents === null || maxUses === "invalid" || maxUsesPerCustomer === "invalid") return { issues }

  return {
    // The switch always travels: left out, the API reads it as off.
    payload: { code, kind: value.kind, percentBps, amountCents, minSubtotalCents, audience: value.audience, shownInStore: value.shownInStore, startsAt: period.startsAt, endsAt: period.endsAt, maxUses, maxUsesPerCustomer },
  }
}
