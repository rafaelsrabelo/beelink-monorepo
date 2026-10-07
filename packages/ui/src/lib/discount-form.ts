/**
 * What the promotions' and the coupons' forms hold while they are filled in: strings, as inputs
 * hold them. The screen turns them into the wire's shape, or into the fields to correct.
 *
 * A `.ts` under `lib/` and not a types file beside the blocks: the package's export map points
 * `./blocks/*` at `.tsx`, so the app could not reach it there.
 */

export type DiscountKindValue = "PERCENT" | "FIXED"
export type PromotionScopeValue = "CART" | "PRODUCTS" | "CATEGORIES"
export type CouponKindValue = DiscountKindValue | "FREE_SHIPPING"
export type DiscountStatusValue = "ACTIVE" | "SCHEDULED" | "PAUSED" | "ENDED" | "EXHAUSTED"
/** Mirrors the wire's `DiscountAudience`: everyone, or only a customer with no order at the shop that stands. */
export type DiscountAudienceValue = "EVERYONE" | "FIRST_PURCHASE"

/** A product or a category chosen for a promotion, by the name the list shows. */
export interface DiscountTargetOption {
  id: string
  name: string
}

export interface PromotionFormValues {
  name: string
  scope: PromotionScopeValue
  kind: DiscountKindValue
  /** Per cent, as typed: "10", "12,5". */
  percent: string
  /** Reais, as typed. */
  amount: string
  audience: DiscountAudienceValue
  /** `yyyy-mm-ddThh:mm`, in the shop's own time. */
  startsAt: string
  /** Empty runs until paused. */
  endsAt: string
  products: DiscountTargetOption[]
  categoryIds: string[]
}

export type PromotionFormIssues = Partial<Record<"name" | "percent" | "amount" | "startsAt" | "endsAt" | "products" | "categories", string>>

export interface CouponFormValues {
  code: string
  kind: CouponKindValue
  percent: string
  amount: string
  /** Reais; empty asks for none. */
  minSubtotal: string
  audience: DiscountAudienceValue
  /** "Mostrar este cupom na loja": off, the code is only for whoever was given it. */
  shownInStore: boolean
  startsAt: string
  endsAt: string
  /** Whole numbers, as typed; empty is no limit. */
  maxUses: string
  maxUsesPerCustomer: string
}

export type CouponFormIssues = Partial<Record<"code" | "percent" | "amount" | "minSubtotal" | "startsAt" | "endsAt" | "maxUses" | "maxUsesPerCustomer", string>>

/** The API's ceiling on what one promotion names. */
export const PROMOTION_TARGETS_MAX = 200

/** Which of a form's two date fields hold a value the browser cannot read yet. */
export interface HalfTypedDates {
  startsAt: boolean
  endsAt: boolean
}

/**
 * A `datetime-local` field with only its date filled in reports an empty value: to the code it
 * reads exactly like one left blank, and a blank end means "never ends". The browser alone knows
 * the difference (`validity.badInput`), so the form asks it as it is sent. The two fields are found
 * by their `name`.
 */
export function halfTypedDates(form: HTMLFormElement): HalfTypedDates {
  const halfTyped = (name: string) => {
    const field = form.elements.namedItem(name)
    return field instanceof HTMLInputElement && field.validity.badInput
  }
  return { startsAt: halfTyped("startsAt"), endsAt: halfTyped("endsAt") }
}
