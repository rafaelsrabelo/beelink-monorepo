// React
import type { ReactNode } from "react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { StorefrontCartLine, type StorefrontCartRow } from "./storefront-cart-line"
import { formatCents } from "./storefront-price"

export interface StorefrontCartProps {
  rows: readonly StorefrontCartRow[]
  /** Only what can be ordered now. */
  subtotalCents: number
  count: number
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
 * The cart page: its lines, and a summary beside them with the subtotal and the way out. Empty, it
 * is a sentence and a way back to the shelf — never a checkout with nothing in it.
 */
export function StorefrontCart({
  rows,
  subtotalCents,
  count,
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
        <dl className="flex items-baseline justify-between gap-4">
          <dt className="text-sm text-shop-muted">
            {text.cartSubtotal} ({count === 1 ? text.cartItemsOne : format(text.cartItems, { count: String(count) })})
          </dt>
          <dd className="text-xl font-extrabold tabular-nums">{formatCents(subtotalCents, locale, "BRL")}</dd>
        </dl>
        {checkout}
      </aside>
    </div>
  )
}
