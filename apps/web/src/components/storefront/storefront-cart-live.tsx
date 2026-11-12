"use client"

// React
import { useEffect, useMemo, type ReactNode } from "react"

// Next
import { useRouter } from "next/navigation"

// Types
import type { CustomerProfile, PublicProductDetail } from "@harness-monorepo/contracts"
import type { StorefrontInstallmentTerms } from "@harness-monorepo/ui/lib/installments"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { StorefrontCart } from "@harness-monorepo/ui/blocks/storefront/storefront-cart"
import { StorefrontCartCheckoutCall } from "@harness-monorepo/ui/blocks/storefront/storefront-cart-checkout-call"
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"
import { installmentOf } from "@harness-monorepo/ui/lib/installments"
import { format } from "@harness-monorepo/ui/locales/index"

// App
import { AppLink } from "@/components/app-link"
import { StorefrontAffiliateNoteLive } from "./affiliate/storefront-affiliate-note-live"
import { CartPriceControls } from "./cart-price-controls"
import { useCart } from "./cart-provider"
import { useCartPricing } from "./use-cart-pricing"
import { pathWithCoupon } from "@/lib/cart-coupon"
import type { ServedQuote } from "@/lib/cart-pricing"
import { cartViewOf, rowKeyOf } from "@/lib/cart-view"

export interface StorefrontCartLiveProps {
  slug: string
  /** The products the cart named when the page was served, priced by the catalogue. */
  products: readonly PublicProductDetail[]
  /**
   * Every product the cart's lines named when the page was served, found or not. A line naming
   * another was added since — from the suggestions under the cart — and is read for, never taken
   * for one whose product left the shop.
   */
  askedIds: readonly string[]
  /** Each product's page, by id: the addresses are the shop's words, built on the server. */
  hrefs: Readonly<Record<string, string>>
  continueHref: string
  /** The checkout's own page: "Finalizar compra" leads there, with the coupon. */
  checkoutHref: string
  /** Whether the page found lines whose product left the shop; they are taken out here. */
  goneOnArrival: boolean
  /** The signed-in shopper; null for a visitor. A price is somebody's, since a first-purchase promotion is. */
  shopper: Pick<CustomerProfile, "id"> | null
  /** What brought the shopper here — an order bought again — said over the cart. */
  arrival?: ReactNode
  /** The cart's price as the page was served with it, so the summary is in the HTML; null and the browser asks. */
  served?: ServedQuote | null
  /** The coupon the page's address named (`?cupom=`) — the first-order banner's — to be checked on arrival; null with none. */
  coupon?: string | null
  /** The shop's card terms, for "em até 6x" under the total; absent when it splits nothing. */
  installments?: StorefrontInstallmentTerms
  locale: string
  messages: UiMessages
}

/**
 * The cart page, following the cart as it changes: its lines, what they come to and "Finalizar
 * compra", which leads to the checkout's own page. Quantities and removals go to the store — which
 * writes the cookie — and the totals are the API's price of the cart (BEELINK-194).
 *
 * The cart is priced as a pick-up: the delivery is chosen in the checkout, where the address is, so
 * its last row is an estimate and says so. The coupon is here too, closed until it is asked for —
 * the first-order banner's arrives applied — and goes on to the checkout in the address.
 *
 * A product added from the suggestions under the cart is a line the page was not served with: the
 * page is read again for it, so it is priced and drawn like any other.
 */
export function StorefrontCartLive({ slug, products, askedIds, hrefs, continueHref, checkoutHref, goneOnArrival, shopper, arrival, served = null, coupon = null, installments, locale, messages }: StorefrontCartLiveProps) {
  const router = useRouter()
  const lines = useCart((cart) => cart.lines)
  const setQty = useCart((cart) => cart.setQty)
  const remove = useCart((cart) => cart.remove)
  const view = useMemo(() => cartViewOf(lines, products), [lines, products])
  const byKey = useMemo(() => new Map(view.rows.map((row) => [rowKeyOf(row), row])), [view.rows])
  const pricing = useCartPricing({ slug, view, fulfillment: "PICKUP", addressId: null, shipping: null, shopperId: shopper?.id ?? null, served, arrivedWith: coupon, locale, messages })
  const { gone, added } = useMemo(() => {
    const asked = new Set(askedIds)
    return { gone: view.gone.filter((line) => asked.has(line.productId)), added: view.gone.filter((line) => !asked.has(line.productId)).map((line) => line.productId).join() }
  }, [view.gone, askedIds])

  // A line the shop no longer sells is taken out of the cookie once, rather than asked for forever.
  useEffect(() => {
    for (const line of gone) remove(line.productId, line.variantId, line.kit)
  }, [gone, remove])

  // The cookie is written as the line goes in, so the page read again has it.
  useEffect(() => {
    if (added) router.refresh()
  }, [added, router])

  const money = (cents: number) => formatCents(cents, locale, "BRL")
  const split = installments ? installmentOf(pricing.totalCents ?? pricing.subtotalCents, installments) : null
  const signedOut = shopper === null

  return (
    <>
      {/* Its own box: the page's element as an only child, never a sibling React asks a key of. */}
      {arrival ? <div className="pt-5">{arrival}</div> : null}
      <StorefrontCart
        rows={view.rows.map((row) => ({ ...row, key: rowKeyOf(row), href: hrefs[row.productId] ?? continueHref, ...pricing.lines.get(rowKeyOf(row)) }))}
        subtotalCents={pricing.subtotalCents}
        count={view.count}
        discounts={pricing.discounts}
        total={pricing.total}
        estimated
        offer={pricing.offer}
        cashback={pricing.cashback}
        pricing={pricing.pricing}
        stale={pricing.stale}
        locale={locale}
        continueHref={continueHref}
        notice={goneOnArrival ? messages.storefront.cartGone : null}
        checkout={
          <>
            <StorefrontAffiliateNoteLive messages={messages} />
            {/* A visitor types no code — the checkout says where it goes — but the banner's arrives here applied. */}
            {signedOut && !pricing.coupon.applied ? null : (
              <CartPriceControls pricing={{ coupon: pricing.coupon, credit: null }} signedOut={signedOut} collapsed disabled={view.count === 0} onChange={(change) => change()} locale={locale} messages={messages} />
            )}
            <StorefrontCartCheckoutCall
              href={pathWithCoupon(checkoutHref, pricing.carried)}
              installments={split ? format(messages.storefront.installments, { count: String(split.count), amount: money(split.amountCents) }) : null}
              disabled={view.count === 0}
              linkComponent={AppLink}
              messages={messages}
            />
          </>
        }
        onQtyChange={(key, qty) => {
          const row = byKey.get(key)
          if (row) setQty(row.productId, row.variantId, qty, row.kit?.parts)
        }}
        onRemove={(key) => {
          const row = byKey.get(key)
          if (row) remove(row.productId, row.variantId, row.kit?.parts)
        }}
        linkComponent={AppLink}
        messages={messages}
      />
    </>
  )
}
