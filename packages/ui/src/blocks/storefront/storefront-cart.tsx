// React
import type { ReactNode } from "react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { StorefrontCartLine, type StorefrontCartRow } from "./storefront-cart-line"
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

export interface StorefrontCartProps {
  rows: readonly StorefrontCartRow[]
  /** Only what can be ordered now — before any promotion, once the cart is priced with its discounts. */
  subtotalCents: number
  count: number
  /** What is taken off, under the subtotal; none, and the summary is the subtotal alone. */
  discounts?: readonly StorefrontCartDiscount[]
  /** The delivery's fee as the shop's rules quote it (BEELINK-178), in words — "R$ 5,00", "Grátis"; none on a pick-up and on a fee agreed afterwards. */
  delivery?: string | null
  /** What is left to pay, in words — "R$ 157,50 + frete". Said under a discount or a fee; the subtotal says it otherwise. */
  total?: string | null
  /** A first-purchase offer that is in none of the amounts above, said under them; none, and nothing is said. */
  offer?: StorefrontCartOffer | null
  /** What the order would earn in cashback, or what is missing to earn it (BEELINK-243), in words; none, and nothing is said. */
  cashback?: string | null
  /** The cart is being priced for the first time: the amounts wait as a skeleton rather than show a sum about to change. */
  pricing?: boolean
  /** The cart changed and is being priced again: the amounts on screen are the ones before the change. */
  stale?: boolean
  locale: string
  /** Back to the shelf. */
  continueHref: string
  /** Something the page had to say — a product that left the shop. */
  notice?: string | null
  onQtyChange?: (key: string, qty: number) => void
  onRemove?: (key: string) => void
  /** The way to close the order, under the subtotal. The cart draws none of its own. */
  checkout?: ReactNode
  linkComponent?: LinkComponent
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
 * The cart page: its lines, and a summary beside them with the subtotal, what was taken off it and
 * the way out. Empty, it is a sentence and a way back to the shelf — never a checkout with nothing
 * in it.
 *
 * The amounts are the API's (BEELINK-194): the delivery's fee, a promotion and a coupon each have
 * their row, and the block adds nothing up — two sums of one cart are two totals to disagree. A first-purchase offer
 * (BEELINK-245) is a sentence under those rows and never one of them: what it names was not taken off.
 */
export function StorefrontCart({
  rows,
  subtotalCents,
  count,
  discounts = [],
  delivery = null,
  total = null,
  offer = null,
  cashback = null,
  pricing = false,
  stale = false,
  locale,
  continueHref,
  notice,
  onQtyChange,
  onRemove,
  checkout,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontCartProps) {
  const text = messages.storefront

  if (!rows.length) {
    return (
      <section className="flex flex-col items-center gap-2 py-16 text-center">
        {notice ? <p role="status" className="text-sm text-shop-muted">{notice}</p> : null}
        <p className="font-medium">{text.cartEmpty}</p>
        <p className="text-sm text-shop-muted">{text.cartEmptyHint}</p>
        <Link href={continueHref} className="mt-2 rounded-[10px] bg-shop-primary px-4 py-2 text-sm font-semibold text-shop-on-primary">
          {text.cartContinue}
        </Link>
      </section>
    )
  }

  return (
    <div className="flex flex-col gap-6 shop-lg:flex-row shop-lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {notice ? <p role="status" className="rounded-[10px] border border-shop-line bg-shop-fill px-4 py-3 text-sm">{notice}</p> : null}
        <ul className="rounded-xl border border-shop-line bg-shop-background px-4">
          {rows.map((row) => (
            <StorefrontCartLine key={row.key} row={row} locale={locale} onQtyChange={onQtyChange} onRemove={onRemove} linkComponent={Link} messages={messages} />
          ))}
        </ul>
        <Link href={continueHref} className="self-start text-sm font-semibold text-shop-primary-ink hover:underline">
          ‹ {text.cartContinue}
        </Link>
      </div>

      <aside aria-labelledby="cart-summary" className="flex flex-col gap-4 rounded-xl border border-shop-line bg-shop-background p-5 shop-lg:sticky shop-lg:top-4 shop-lg:w-80">
        <h2 id="cart-summary" className="text-lg font-extrabold">{text.cartSummary}</h2>
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
              <dt className="text-sm font-semibold">{text.cartTotal}</dt>
              <dd className="text-xl font-extrabold tabular-nums">{total}</dd>
            </div>
          ) : null}
        </dl>
        {/* It comes from the same pricing as the rows above: it waits and dims with them. */}
        {offer && !pricing ? <p className={cn("text-sm break-words transition-opacity", OFFER_TONE[offer.tone], stale && "opacity-60")}>{offer.text}</p> : null}
        {cashback && !pricing ? <p className={cn("text-sm font-semibold break-words text-shop-positive-ink transition-opacity", stale && "opacity-60")}>{cashback}</p> : null}
        {checkout}
      </aside>
    </div>
  )
}
