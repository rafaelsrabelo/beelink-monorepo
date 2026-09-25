// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import { cn } from "@harness-monorepo/ui/lib/utils"

/**
 * Where a price is drawn, which decides its size and where the old price goes:
 * - `card`: the shelf's card — 28px integer, the old price beside it;
 * - `product`: the product page's information column — 36px, "-N%" before it, "De:" under it;
 * - `buyBox`: the buy box — 32px, nothing else, the column already said the rest;
 * - `compact`: one string at 18px, for a related product's small card.
 */
export type StorefrontPriceSize = "card" | "product" | "buyBox" | "compact"

export interface StorefrontPriceProps {
  priceCents: number
  /** What it cost before. Null means no discount; the percentage is computed, never stored. */
  compareAtPriceCents?: number | null
  /** The shopper's language decides the separator and the currency's place, not this file. */
  locale: string
  currency?: string
  size?: StorefrontPriceSize
  /** Whether the saving is said beside the price. The badge on a photo is the photo's, not this. */
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
 * The price in three pieces — the currency, the integer with its grouping, the cents — from the
 * formatter's own parts and never by slicing the string: "R$ 1.299,90" keeps its separator, and a
 * language that puts the currency after the number keeps that too.
 */
export function priceParts(cents: number, locale: string, currency: string): { currency: string; integer: string; fraction: string } {
  const parts = new Intl.NumberFormat(locale, { style: "currency", currency }).formatToParts(cents / 100)
  const pick = (types: readonly string[]) => parts.filter((part) => types.includes(part.type)).map((part) => part.value).join("")
  return { currency: pick(["currency"]).trim(), integer: pick(["integer", "group"]), fraction: pick(["fraction"]) }
}

const INTEGER_SIZE: Record<Exclude<StorefrontPriceSize, "compact">, string> = {
  card: "text-[28px]",
  product: "text-4xl",
  buyBox: "text-[32px]",
}

/** The integer large, the currency and the cents small and raised beside it, as 5a and 5b draw it. */
function SplitPrice({ cents, locale, currency, size }: { cents: number; locale: string; currency: string; size: Exclude<StorefrontPriceSize, "compact"> }) {
  const parts = priceParts(cents, locale, currency)
  const small = size === "card" ? "text-[13px]" : "text-sm"

  return (
    <span aria-hidden="true" className="flex items-start gap-0.5">
      <span className={cn(small, "mt-1")}>{parts.currency}</span>
      <span className={cn(INTEGER_SIZE[size], "leading-none font-extrabold")}>{parts.integer}</span>
      <span className={cn(small, "mt-[3px] font-extrabold")}>{parts.fraction}</span>
    </span>
  )
}

/**
 * A price, and what it was.
 *
 * The percentage is derived from the pair on every render rather than stored beside them: two
 * numbers and a percentage are three facts that can disagree, and the shop only ever knows two.
 *
 * The pieces are drawn for the eye and hidden from a reader, who hears the whole price once
 * through the sr-only text: "R$" then "119" then "90" is not a price to a screen reader.
 */
export function StorefrontPrice({
  priceCents,
  compareAtPriceCents,
  locale,
  currency = "BRL",
  size = "card",
  showBadge = true,
  className,
  messages = defaultMessages,
}: StorefrontPriceProps) {
  const text = messages.storefront
  const hasDiscount = typeof compareAtPriceCents === "number" && compareAtPriceCents > priceCents
  const percent = hasDiscount ? discountPercent(priceCents, compareAtPriceCents) : 0
  const price = formatCents(priceCents, locale, currency)
  const was = hasDiscount ? formatCents(compareAtPriceCents, locale, currency) : null

  if (size === "compact") {
    return (
      <span className={cn("text-lg font-extrabold", className)}>
        {price}
        {was ? <span className="sr-only">{format(text.priceWas, { price: was })}</span> : null}
      </span>
    )
  }

  if (size === "product") {
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <span className="sr-only">{price}</span>
        <div className="flex items-start gap-2.5">
          {was && showBadge && percent > 0 ? (
            <span aria-hidden="true" className="text-[26px] leading-[1.2] font-normal text-shop-sale-ink">
              {format(text.discount, { percent: String(percent) })}
            </span>
          ) : null}
          <SplitPrice cents={priceCents} locale={locale} currency={currency} size="product" />
        </div>
        {was ? (
          <span className="text-[13px] text-shop-muted">
            {format(text.priceWas, { price: "" }).trim()} <s>{was}</s>
          </span>
        ) : null}
      </div>
    )
  }

  if (size === "buyBox") {
    return (
      <div className={className}>
        <span className="sr-only">{price}</span>
        <SplitPrice cents={priceCents} locale={locale} currency={currency} size="buyBox" />
      </div>
    )
  }

  return (
    // The old price sits to the right, at the baseline; the row wraps where a card is too narrow
    // for both — a phone's two columns, the home's rail — so it drops under rather than breaking.
    <div className={cn("flex flex-wrap items-end gap-x-2 gap-y-0.5", className)}>
      <span className="sr-only">{price}</span>
      <SplitPrice cents={priceCents} locale={locale} currency={currency} size="card" />
      {was ? (
        <s className="text-[13px] text-shop-muted">
          <span className="sr-only">{format(text.priceWas, { price: "" }).trim()} </span>
          {was}
        </s>
      ) : null}
    </div>
  )
}

export interface StorefrontDiscountBadgeProps {
  priceCents: number
  compareAtPriceCents: number | null
  /** On a shelf card's photo, or on the product page's main photo, which is bigger. */
  placement?: "card" | "photo"
  className?: string
  messages?: UiMessages
}

/**
 * "-20%" in the sale colour, over a photo. Its own block because the photo draws it, not the
 * price: on the card it sits in the top-right corner, on the product page's photo top-left.
 * Nothing is drawn without a real saving.
 */
export function StorefrontDiscountBadge({
  priceCents,
  compareAtPriceCents,
  placement = "card",
  className,
  messages = defaultMessages,
}: StorefrontDiscountBadgeProps) {
  if (compareAtPriceCents === null || compareAtPriceCents <= priceCents) return null
  const percent = discountPercent(priceCents, compareAtPriceCents)
  if (percent <= 0) return null

  return (
    <span
      className={cn(
        // Over a photo that passes, zooms or opens on a press: above it, and the pointer goes through.
        "pointer-events-none absolute z-[2] font-extrabold text-shop-on-sale bg-shop-sale",
        placement === "card" ? "top-2.5 right-2.5 rounded-md px-2 py-1 text-xs" : "top-3.5 left-3.5 rounded-[8px] px-2.5 py-[5px] text-[13px]",
        className,
      )}
    >
      {format(messages.storefront.discount, { percent: String(percent) })}
    </span>
  )
}
