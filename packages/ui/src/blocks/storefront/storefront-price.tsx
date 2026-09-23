// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import { cn } from "@harness-monorepo/ui/lib/utils"

export interface StorefrontPriceProps {
  priceCents: number
  /** What it cost before. Null means no discount; the percentage is computed, never stored. */
  compareAtPriceCents?: number | null
  /** The shopper's language decides the separator and the currency's place, not this file. */
  locale: string
  currency?: string
  showBadge?: boolean
  className?: string
  messages?: UiMessages
}

/** Cents, always. A float here is a price that is off by one cent on a hundredth of the orders. */
export function formatCents(cents: number, locale: string, currency: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100)
}

/**
 * Rounded down, so a 49.6% discount never advertises itself as 50%. The shop is making a claim
 * about money here and the rounding should never be in its favour.
 */
export function discountPercent(priceCents: number, compareAtPriceCents: number): number {
  return Math.floor(((compareAtPriceCents - priceCents) / compareAtPriceCents) * 100)
}

/**
 * A price, and what it was.
 *
 * The percentage is derived from the pair on every render rather than stored beside them: two
 * numbers and a percentage are three facts that can disagree, and the shop only ever knows two.
 */
export function StorefrontPrice({
  priceCents,
  compareAtPriceCents,
  locale,
  currency = "BRL",
  showBadge = true,
  className,
  messages = defaultMessages,
}: StorefrontPriceProps) {
  const text = messages.storefront
  const hasDiscount = typeof compareAtPriceCents === "number" && compareAtPriceCents > priceCents
  const percent = hasDiscount ? discountPercent(priceCents, compareAtPriceCents) : 0

  return (
    // Wrapping, and the old price on its own line above: at two columns on a phone the price, the
    // struck-through price and the badge do not fit side by side, and an inline row breaks in the
    // middle of the badge. The card is the narrowest place this renders, so it is the one that
    // decides the shape.
    <div className={cn("flex flex-col gap-0.5", className)}>
      {hasDiscount ? (
        <s className="text-xs opacity-60">{formatCents(compareAtPriceCents, locale, currency)}</s>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-lg font-semibold">{formatCents(priceCents, locale, currency)}</span>
        {hasDiscount && showBadge && percent > 0 ? (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap"
            style={{ backgroundColor: "var(--shop-primary)", color: "var(--shop-on-primary)" }}
          >
            {format(text.discount, { percent: String(percent) })}
          </span>
        ) : null}
      </div>
    </div>
  )
}
