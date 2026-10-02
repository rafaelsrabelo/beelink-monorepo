"use client"

// Types
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { StorefrontCashbackUse } from "@harness-monorepo/ui/blocks/storefront/storefront-cashback-use"
import { StorefrontCoupon } from "@harness-monorepo/ui/blocks/storefront/storefront-coupon"
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"

// App
import type { CartPricingHandle } from "./use-cart-pricing"

export interface CartPriceControlsProps {
  pricing: Pick<CartPricingHandle, "coupon" | "credit">
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
 * What the shopper sets about the cart's price, over the checkout: the coupon's field (BEELINK-194)
 * and, for one with credit at the shop, "Usar meu cashback" (BEELINK-244). Each change prices the
 * cart again; the totals above are the answer.
 */
export function CartPriceControls({ pricing: { coupon, credit }, signedOut, disabled, onChange, locale, messages }: CartPriceControlsProps) {
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
