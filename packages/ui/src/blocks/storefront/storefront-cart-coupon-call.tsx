// React
import { useId } from "react"

// Libs
import { TicketPercentIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { CartCouponCall } from "@harness-monorepo/ui/lib/shop-offers"

export interface StorefrontCartCouponCallProps {
  /** The coupon called to, and the sentence that leads to its code — built by the screen from the API's numbers. */
  call: CartCouponCall
  onApply?: (code: string) => void
  /** The code is being checked: the button says so, and is not pressed twice. */
  pending?: boolean
  /** The order is on its way: nothing is applied any more. */
  disabled?: boolean
  messages?: UiMessages
}

/**
 * The cart's call to a coupon its customer has and did not apply (BEELINK-311): one sentence, the
 * code, and one press that applies it — over the coupon's field, in the shop's tint, so it is not
 * missed. It is the one place left that says the code once the shop's first-purchase notice was
 * closed, which is why it has no "×": it is in the cart alone, and it goes when a coupon is applied.
 *
 * Which coupon, and that applying it now is taken, is not decided here: the screen picks it from
 * the list the API read against this very cart. Its button does what typing the code does.
 */
export function StorefrontCartCouponCall({ call, onApply, pending = false, disabled = false, messages = defaultMessages }: StorefrontCartCouponCallProps) {
  const text = messages.storefront
  const id = useId()

  return (
    <div className="flex flex-col gap-2.5 rounded-[10px] border border-shop-primary bg-shop-primary-tint p-3 text-shop-on-background">
      <p id={`${id}-call`} className="flex items-start gap-2 text-sm leading-snug">
        <TicketPercentIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-shop-primary-ink" />
        <span className="min-w-0 break-words">
          <span className="font-medium">{call.message}</span>{" "}
          <strong className="font-mono font-bold tracking-wide break-all">{call.code}</strong>
        </span>
      </p>
      <button
        type="button"
        disabled={pending || disabled}
        aria-busy={pending || undefined}
        aria-describedby={`${id}-call`}
        onClick={() => onApply?.(call.code)}
        className="h-11 w-full rounded-[10px] bg-shop-primary px-4 text-sm font-semibold text-shop-on-primary hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? text.couponChecking : text.offers.cartCallApply}
      </button>
    </div>
  )
}
