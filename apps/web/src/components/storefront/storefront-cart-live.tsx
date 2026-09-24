"use client"

// React
import { useEffect, useMemo } from "react"

// Types
import type { PublicProductDetail } from "@harness-monorepo/contracts"

// UI
import { StorefrontCart } from "@harness-monorepo/ui/blocks/storefront/storefront-cart"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { useCart } from "./cart-provider"
import { cartViewOf, rowKeyOf } from "@/lib/cart-view"

export interface StorefrontCartLiveProps {
  /** The products the cart named when the page was served, priced by the catalogue. */
  products: readonly PublicProductDetail[]
  /** Each product's page, by id: the addresses are the shop's words, built on the server. */
  hrefs: Readonly<Record<string, string>>
  continueHref: string
  /** Whether the page found lines whose product left the shop; they are taken out here. */
  goneOnArrival: boolean
  locale: string
  messages: UiMessages
}

/**
 * The cart page, following the cart as it changes. Quantities and removals go to the store — which
 * writes the cookie — and the totals are recomputed from the prices the page was served with, so
 * nothing is asked of the server until the next page.
 */
export function StorefrontCartLive({ products, hrefs, continueHref, goneOnArrival, locale, messages }: StorefrontCartLiveProps) {
  const lines = useCart((cart) => cart.lines)
  const setQty = useCart((cart) => cart.setQty)
  const remove = useCart((cart) => cart.remove)
  const view = useMemo(() => cartViewOf(lines, products), [lines, products])
  const byKey = useMemo(() => new Map(view.rows.map((row) => [rowKeyOf(row), row])), [view.rows])

  // A line the shop no longer sells is taken out of the cookie once, rather than asked for forever.
  useEffect(() => {
    for (const line of view.gone) remove(line.productId, line.variantId)
  }, [view.gone, remove])

  return (
    <StorefrontCart
      rows={view.rows.map((row) => ({ ...row, key: rowKeyOf(row), href: hrefs[row.productId] ?? continueHref }))}
      subtotalCents={view.subtotalCents}
      count={view.count}
      locale={locale}
      continueHref={continueHref}
      notice={goneOnArrival ? messages.storefront.cartGone : null}
      onQtyChange={(key, qty) => {
        const row = byKey.get(key)
        if (row) setQty(row.productId, row.variantId, qty)
      }}
      onRemove={(key) => {
        const row = byKey.get(key)
        if (row) remove(row.productId, row.variantId)
      }}
      messages={messages}
    />
  )
}
