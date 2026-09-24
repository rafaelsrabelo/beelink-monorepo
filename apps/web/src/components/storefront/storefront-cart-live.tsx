"use client"

// React
import { useEffect, useMemo, useState } from "react"

// Types
import type { PublicProductDetail } from "@harness-monorepo/contracts"

// UI
import { StorefrontCart } from "@harness-monorepo/ui/blocks/storefront/storefront-cart"
import { StorefrontCheckout } from "@harness-monorepo/ui/blocks/storefront/storefront-checkout"
import { StorefrontOrderSent } from "@harness-monorepo/ui/blocks/storefront/storefront-order-sent"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { useCart } from "./cart-provider"
import { cartViewOf, rowKeyOf } from "@/lib/cart-view"
import { orderMessageOf, whatsappOrderHref } from "@/lib/whatsapp-order"

export interface StorefrontCartLiveProps {
  /** The products the cart named when the page was served, priced by the catalogue. */
  products: readonly PublicProductDetail[]
  /** Each product's page, by id: the addresses are the shop's words, built on the server. */
  hrefs: Readonly<Record<string, string>>
  continueHref: string
  /** Whether the page found lines whose product left the shop; they are taken out here. */
  goneOnArrival: boolean
  shopName: string
  /** The shop's WhatsApp as `wa.me` wants it, digits only; null when it has none. */
  whatsapp: string | null
  locale: string
  messages: UiMessages
}

/**
 * The cart page, following the cart as it changes. Quantities and removals go to the store — which
 * writes the cookie — and the totals are recomputed from the prices the page was served with, so
 * nothing is asked of the server until the next page.
 */
export function StorefrontCartLive({ products, hrefs, continueHref, goneOnArrival, shopName, whatsapp, locale, messages }: StorefrontCartLiveProps) {
  const lines = useCart((cart) => cart.lines)
  const setQty = useCart((cart) => cart.setQty)
  const remove = useCart((cart) => cart.remove)
  const clear = useCart((cart) => cart.clear)
  // The link that was opened, once the order has gone: the cart it came from is emptied.
  const [sent, setSent] = useState<string | null>(null)
  const view = useMemo(() => cartViewOf(lines, products), [lines, products])
  const byKey = useMemo(() => new Map(view.rows.map((row) => [rowKeyOf(row), row])), [view.rows])

  // A line the shop no longer sells is taken out of the cookie once, rather than asked for forever.
  useEffect(() => {
    for (const line of view.gone) remove(line.productId, line.variantId)
  }, [view.gone, remove])

  if (sent) return <StorefrontOrderSent href={sent} continueHref={continueHref} messages={messages} />

  return (
    <StorefrontCart
      rows={view.rows.map((row) => ({ ...row, key: rowKeyOf(row), href: hrefs[row.productId] ?? continueHref }))}
      subtotalCents={view.subtotalCents}
      count={view.count}
      locale={locale}
      continueHref={continueHref}
      notice={goneOnArrival ? messages.storefront.cartGone : null}
      checkout={
        <StorefrontCheckout
          hrefFor={
            whatsapp
              ? (customerName) => whatsappOrderHref(whatsapp, orderMessageOf({ shopName, view, customerName, locale, messages }))
              : null
          }
          disabled={view.count === 0}
          onSend={(href) => {
            setSent(href)
            clear()
          }}
          messages={messages}
        />
      }
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
