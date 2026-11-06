"use client"

// React
import { useId, useState, type ReactNode } from "react"

// Libs
import { ChevronRightIcon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"
import { productImageOf } from "@harness-monorepo/ui/lib/product-image"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import type { StorefrontCartRow } from "./storefront-cart-line"
import { formatCents } from "./storefront-price"

export interface StorefrontCheckoutSummaryProps {
  rows: readonly StorefrontCartRow[]
  /** Units that can be ordered now. */
  count: number
  /** What the order comes to, in words, on the closed summary's line: the total, or the subtotal while nothing else stands. */
  amount: string
  /** No price yet: the amount on the closed line waits as a skeleton. */
  pricing?: boolean
  /** The cart's page, where the lines are changed: the checkout only reads them. */
  editHref: string
  /** The amounts, under the lines: `StorefrontCartTotals`. */
  children: ReactNode
  locale: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The checkout's "Resumo": the lines as they will be ordered and what they come to. On a phone it is
 * one line — "Resumo (3) R$ 547,00 ›" — that opens to show them, so the steps are on the first screen;
 * from `shop-lg` it stands open beside the steps, and the line that opens it is not drawn.
 *
 * The lines are read here, never changed: "Editar carrinho" goes back to the cart, where they are.
 */
export function StorefrontCheckoutSummary({ rows, count, amount, pricing = false, editHref, children, locale, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontCheckoutSummaryProps) {
  const text = messages.storefront
  const id = useId()
  const [open, setOpen] = useState(false)
  const money = (cents: number) => formatCents(cents, locale, "BRL")

  return (
    <section aria-labelledby={`${id}-heading`} className="flex flex-col rounded-xl border border-shop-line bg-shop-background">
      <h2 className="shop-lg:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-body`}
          onClick={() => setOpen((was) => !was)}
          className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl bg-shop-fill px-4 text-start"
        >
          <span className="text-sm font-bold">
            {format(text.checkoutSummaryToggle, { count: String(count) })}
          </span>
          {/* Read as two words: "Resumo (3) R$ 547,00". A space between flex items draws nothing. */}{" "}
          <span className="flex items-center gap-1">
            {pricing ? <span aria-hidden="true" className="h-5 w-20 animate-pulse rounded bg-shop-line" /> : <span className="text-sm font-bold tabular-nums">{amount}</span>}
            <ChevronRightIcon aria-hidden="true" className={cn("size-5 transition-transform", open && "rotate-90")} />
          </span>
        </button>
      </h2>
      <h2 id={`${id}-heading`} className="hidden px-5 pt-5 text-lg font-extrabold shop-lg:block">{text.cartSummary}</h2>

      <div id={`${id}-body`} className={cn("flex-col gap-4 p-4 shop-lg:flex shop-lg:p-5", open ? "flex" : "hidden")}>
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.key} className={cn("flex items-start gap-3", !row.available && "opacity-70")}>
              <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-shop-placeholder">
                <img src={productImageOf(row.imageUrl)} alt="" className="size-full object-cover" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="line-clamp-2 text-sm font-medium">{row.name}</p>
                {row.variantLabel ? <p className="text-xs text-shop-muted">{row.variantLabel}</p> : null}
                <p className="text-xs text-shop-muted">{format(text.checkoutSummaryQty, { qty: String(row.qty) })}</p>
                {row.promotion ? <p className="text-xs font-semibold text-shop-positive-ink">{format(text.promotion, { name: row.promotion })}</p> : null}
                {row.available ? null : <p className="text-xs font-semibold text-shop-sale-ink">{text.cartUnavailable}</p>}
              </div>
              <div className="flex shrink-0 flex-col items-end">
                {row.available && typeof row.wasCents === "number" && row.wasCents > row.lineTotalCents ? (
                  <s className="text-xs text-shop-muted tabular-nums">
                    <span className="sr-only">{format(text.priceWas, { price: "" }).trim()} </span>
                    {money(row.wasCents)}
                  </s>
                ) : null}
                <p className={cn("text-sm font-bold tabular-nums", !row.available && "line-through")}>{money(row.lineTotalCents)}</p>
              </div>
            </li>
          ))}
        </ul>
        <Link href={editHref} className="self-start text-sm font-semibold text-shop-primary-ink hover:underline">
          {text.checkoutEditCart}
        </Link>
        <div className="flex flex-col gap-4 border-t border-shop-line pt-4">{children}</div>
      </div>
    </section>
  )
}
