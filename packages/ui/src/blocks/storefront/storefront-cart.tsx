// React
import type { ReactNode } from "react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { StorefrontCartLine, type StorefrontCartRow } from "./storefront-cart-line"
import { StorefrontCartTotals, type StorefrontCartDiscount, type StorefrontCartOffer } from "./storefront-cart-totals"

export type { StorefrontCartDiscount, StorefrontCartOffer } from "./storefront-cart-totals"

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
  /** The delivery is chosen later, in the checkout: the last row is an estimate, and says so. */
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
  /** Back to the shelf. */
  continueHref: string
  /** Something the page had to say — a product that left the shop. */
  notice?: string | null
  onQtyChange?: (key: string, qty: number) => void
  onRemove?: (key: string) => void
  /** The way on to the checkout, under the amounts: "Finalizar compra". The cart draws none of its own. */
  checkout?: ReactNode
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The cart page: its lines, and a summary beside them with the subtotal, what was taken off it and
 * the way on to the checkout, which is a page of its own. Empty, it is a sentence and a way back to
 * the shelf — never a checkout with nothing in it.
 *
 * The amounts are `StorefrontCartTotals`, the checkout's summary's own.
 */
export function StorefrontCart({
  rows,
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
        <StorefrontCartTotals
          subtotalCents={subtotalCents}
          count={count}
          discounts={discounts}
          delivery={delivery}
          total={total}
          estimated={estimated}
          offer={offer}
          cashback={cashback}
          pricing={pricing}
          stale={stale}
          locale={locale}
          messages={messages}
        />
        {checkout}
      </aside>
    </div>
  )
}
