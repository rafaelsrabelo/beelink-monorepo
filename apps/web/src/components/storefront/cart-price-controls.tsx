"use client"

// Types
import type { OfferedCoupon } from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { StorefrontCartCoupons } from "@harness-monorepo/ui/blocks/storefront/storefront-cart-coupons"
import { StorefrontCashbackUse } from "@harness-monorepo/ui/blocks/storefront/storefront-cashback-use"
import { StorefrontCoupon } from "@harness-monorepo/ui/blocks/storefront/storefront-coupon"
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"
import { cartCouponRowsOf } from "@harness-monorepo/ui/lib/shop-offers"

// App
import type { CartPricingHandle } from "./use-cart-pricing"

export interface CartPriceControlsProps {
  pricing: Pick<CartPricingHandle, "coupon" | "credit">
  /** The shop's shown coupons this cart may take, as the API lists them; absent or empty, the list is not drawn. */
  offers?: readonly OfferedCoupon[]
  /** A visitor: a coupon is asked of them once they sign in, and credit is nobody's. */
  signedOut: boolean
  /** The order is on its way, or there is nothing to order. */
  disabled: boolean
  /** Runs a change of the price's terms: the cart's page forgets what it said of the last order. */
  onChange: (change: () => void) => void
  locale: string
  messages: UiMessages
}

/**
 * What the shopper sets about the cart's price, over the checkout: the coupon's field (BEELINK-194),
 * the coupons the shop shows for them to take and, for one with credit at the shop, "Usar meu
 * cashback" (BEELINK-244). Each change prices the cart again; the totals above are the answer.
 *
 * "Aplicar" on a listed coupon is the field's own `apply` with that code: one check, one way in —
 * the code is priced with the cart exactly as one typed is, and lands in the address as `?cupom=`.
 */
export function CartPriceControls({ pricing: { coupon, credit }, offers = [], signedOut, disabled, onChange, locale, messages }: CartPriceControlsProps) {
  const money = (cents: number) => formatCents(cents, locale, "BRL")

  return (
    <>
      <StorefrontCoupon
        signedOut={signedOut}
        applied={coupon.applied}
        holding={coupon.holding}
        pending={coupon.pending}
        error={coupon.error}
        onApply={(code) => onChange(() => coupon.apply(code))}
        onRemove={() => onChange(coupon.remove)}
        onEdit={coupon.edit}
        disabled={disabled}
        messages={messages}
      />
      {/* A visitor is told of no code: the API lists none for them, and nothing is drawn if it ever did. */}
      {signedOut ? null : (
        <StorefrontCartCoupons
          coupons={cartCouponRowsOf(offers, locale, messages.storefront.offers)}
          applied={coupon.applied}
          onApply={(code) => onChange(() => coupon.apply(code))}
          disabled={disabled || coupon.pending}
          messages={messages}
        />
      )}
      {credit ? (
        <StorefrontCashbackUse
          balance={money(credit.balanceCents)}
          checked={credit.checked}
          cappedAt={credit.maxCents < credit.balanceCents ? money(credit.maxCents) : null}
          nothingToPay={credit.nothingToPay}
          onCheckedChange={(checked) => onChange(() => credit.toggle(checked))}
          disabled={disabled}
          messages={messages}
        />
      ) : null}
    </>
  )
}
