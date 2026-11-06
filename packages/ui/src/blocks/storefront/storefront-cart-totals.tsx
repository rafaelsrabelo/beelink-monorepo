// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { formatCents } from "./storefront-price"

/** What was taken off the cart, a row each: a promotion, a coupon. Already in words. */
export interface StorefrontCartDiscount {
  key: string
  label: string
  /** "− R$ 25,00", or "Frete grátis". */
  value: string
}

/**
 * A first-purchase promotion the cart would get and did not: "open" is an offer waiting for the
 * visitor to identify themselves, "closed" is one that is not this customer's, with the reason.
 * The text arrives already in words.
 */
export interface StorefrontCartOffer {
  text: string
  tone: "open" | "closed"
}

export interface StorefrontCartTotalsProps {
  /** Only what can be ordered now — before any promotion, once the cart is priced with its discounts. */
  subtotalCents: number
  count: number
  /** What is taken off, under the subtotal; none, and the summary is the subtotal alone. */
  discounts?: readonly StorefrontCartDiscount[]
  /** The delivery's fee as the shop's rules quote it (BEELINK-178), in words — "R$ 5,00", "Grátis"; none on a pick-up and on a fee agreed afterwards. */
  delivery?: string | null
  /** What is left to pay, in words — "R$ 157,50 + frete". Said under a discount or a fee; the subtotal says it otherwise. */
  total?: string | null
  /** The cart's page, where the delivery is not chosen yet: its last row is an estimate, and says so. */
  estimated?: boolean
  /** A first-purchase offer that is in none of the amounts above, said under them; none, and nothing is said. */
  offer?: StorefrontCartOffer | null
  /** What the order would earn in cashback, or what is missing to earn it (BEELINK-243), in words; none, and nothing is said. */
  cashback?: string | null
  /** The cart is being priced for the first time: the amounts wait as a skeleton rather than show a sum about to change. */
  pricing?: boolean
  /** The cart changed and is being priced again: the amounts on screen are the ones before the change. */
  stale?: boolean
  locale: string
  messages?: UiMessages
}

/**
 * An offer still open wears the shop's tint, to be noticed; one that is not this customer's is said
 * quietly. The words on the tint stay the page's ink: the brand's is measured to read on the page,
 * and its own tint takes that contrast back.
 */
const OFFER_TONE: Record<StorefrontCartOffer["tone"], string> = {
  open: "rounded-[10px] bg-shop-primary-tint px-4 py-3 font-medium",
  closed: "text-shop-muted",
}

/**
 * The amounts of a cart, as the cart's page and the checkout's summary both draw them: the subtotal,
 * the delivery, what was taken off and what is left, then the sentences under them.
 *
 * The amounts are the API's (BEELINK-194): the delivery's fee, a promotion and a coupon each have
 * their row, and the block adds nothing up — two sums of one cart are two totals to disagree. A
 * first-purchase offer (BEELINK-245) is a sentence under those rows and never one of them: what it
 * names was not taken off.
 */
export function StorefrontCartTotals({
  subtotalCents,
  count,
  discounts = [],
  delivery = null,
  total = null,
  estimated = false,
  offer = null,
  cashback = null,
  pricing = false,
  stale = false,
  locale,
  messages = defaultMessages,
}: StorefrontCartTotalsProps) {
  const text = messages.storefront

  return (
    <>
      <dl aria-busy={pricing || stale || undefined} className={cn("flex flex-col gap-2 transition-opacity", stale && "opacity-60")}>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-sm text-shop-muted">
            {text.cartSubtotal} ({count === 1 ? text.cartItemsOne : format(text.cartItems, { count: String(count) })})
          </dt>
          {pricing ? (
            <dd aria-hidden="true" className="h-7 w-24 animate-pulse rounded bg-shop-fill" />
          ) : (
            // The largest number of the summary is what is paid: the subtotal, until a total stands under it.
            <dd className={cn("tabular-nums", total ? "text-sm font-semibold" : "text-xl font-extrabold")}>{formatCents(subtotalCents, locale, "BRL")}</dd>
          )}
        </div>
        {delivery && !pricing ? (
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <dt>{text.cartDelivery}</dt>
            <dd className="shrink-0 font-semibold tabular-nums">{delivery}</dd>
          </div>
        ) : null}
        {pricing
          ? null
          : discounts.map((row) => (
              <div key={row.key} className="flex items-baseline justify-between gap-4 text-sm">
                <dt className="min-w-0 break-words">{row.label}</dt>
                <dd className="shrink-0 font-bold text-shop-positive-ink tabular-nums">{row.value}</dd>
              </div>
            ))}
        {total && !pricing ? (
          <div className="flex items-baseline justify-between gap-4 border-t border-shop-line pt-2">
            <dt className="text-sm font-semibold">{estimated ? text.cartEstimatedTotal : text.cartTotal}</dt>
            <dd className="text-xl font-extrabold tabular-nums">{total}</dd>
          </div>
        ) : null}
      </dl>
      {/* It comes from the same pricing as the rows above: it waits and dims with them. */}
      {offer && !pricing ? <p className={cn("text-sm break-words transition-opacity", OFFER_TONE[offer.tone], stale && "opacity-60")}>{offer.text}</p> : null}
      {cashback && !pricing ? <p className={cn("text-sm font-semibold break-words text-shop-positive-ink transition-opacity", stale && "opacity-60")}>{cashback}</p> : null}
    </>
  )
}
