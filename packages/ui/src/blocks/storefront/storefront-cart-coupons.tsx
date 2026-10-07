// React
import { useId } from "react"

// Libs
import { CheckIcon, TicketIcon } from "lucide-react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { CartCouponRow } from "@harness-monorepo/ui/lib/shop-offers"

export interface StorefrontCartCouponsProps {
  /** The shop's shown coupons this customer may use on this cart, as the API listed them. */
  coupons: readonly CartCouponRow[]
  /** The code in force in the cart, as the shop stores it: its row is marked and offers nothing. */
  applied?: string | null
  onApply?: (code: string) => void
  /** A code is being checked, or the order is on its way: nothing is pressed meanwhile. */
  disabled?: boolean
  messages?: UiMessages
}

const APPLY =
  "h-11 shrink-0 rounded-[10px] border border-shop-line-strong px-4 text-sm font-semibold text-shop-primary-ink hover:bg-shop-fill disabled:cursor-not-allowed disabled:opacity-50"

/**
 * "Cupons disponíveis", in the cart's summary under the coupon's field: the codes the shop chose to
 * show, for the customer to take without having been told them.
 *
 * Which coupons, and whether one may be pressed, is not decided here: the list is the API's, read
 * against this very cart. A row with `missing` is short of its minimum and says by how much instead
 * of offering a press that would be refused; the one in force is marked and not offered again.
 *
 * With no coupon it draws nothing — no heading over an empty list, at most shops and for most
 * customers. "Aplicar" does what typing the code does: the screen hands both to the same check.
 */
export function StorefrontCartCoupons({ coupons, applied = null, onApply, disabled = false, messages = defaultMessages }: StorefrontCartCouponsProps) {
  const text = messages.storefront.offers
  const id = useId()
  if (coupons.length === 0) return null

  const inForce = applied?.toUpperCase() ?? null

  return (
    <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-2">
      <h3 id={`${id}-heading`} className="text-sm font-semibold">
        {text.cartHeading}
      </h3>
      <ul className="flex flex-col gap-2">
        {coupons.map((coupon) => {
          const taken = coupon.code.toUpperCase() === inForce
          return (
            <li key={coupon.code} className="flex items-center gap-3 rounded-[10px] border border-dashed border-shop-line-strong px-3 py-2">
              <TicketIcon aria-hidden="true" className="size-4 shrink-0 text-shop-muted" />
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="text-sm break-all">
                  <strong className="font-mono font-bold">{coupon.code}</strong>
                </p>
                <p className="text-sm">{[coupon.benefit, ...coupon.conditions].join(" · ")}</p>
                {coupon.missing && !taken ? <p className="text-sm text-shop-muted">{coupon.missing}</p> : null}
              </div>
              {taken ? (
                <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-shop-positive-ink">
                  <CheckIcon aria-hidden="true" className="size-4" />
                  {text.cartApplied}
                </span>
              ) : coupon.missing ? null : (
                <button type="button" disabled={disabled} aria-label={format(text.cartApplyNamed, { code: coupon.code })} onClick={() => onApply?.(coupon.code)} className={APPLY}>
                  {text.cartApply}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
