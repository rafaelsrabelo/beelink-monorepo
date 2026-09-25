"use client"

// React
import { useEffect, useRef, useState } from "react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { WhatsAppIcon } from "../store/store-brand-icons"
import type { PaymentMethod } from "../store/store-types"
import { BUY_PILL, StorefrontBuyActions } from "./storefront-buy-actions"
import { StorefrontBuyBar } from "./storefront-buy-bar"
import { StorefrontPrice } from "./storefront-price"
import { StorefrontProductBuy } from "./storefront-product-buy"
import { StorefrontSellerTable } from "./storefront-seller-table"

export interface StorefrontProductPurchaseProps {
  name: string
  /** The chosen combination's price, or the product's. */
  priceCents: number
  compareAtPriceCents: number | null
  locale: string
  showPrice: boolean
  /** The chosen combination, or the product without options, can be ordered now. */
  available: boolean
  /** The product has options, which picks the sold-out sentence. */
  choosing: boolean
  /** What is chosen now — the combination's id — so an add counts for that choice and no other. */
  choiceKey: string
  /** "Em estoque" is the shop's to hide; "Esgotado" never is, since it explains the missing buttons. */
  showStock?: boolean
  /** Puts that many of the chosen combination in the cart, with the cart's address. */
  cart?: { onAdd: (qty: number) => void; href: string }
  /** Opens "Avise-me" for a sold-out combination; absent, it offers nothing. */
  onNotify?: () => void
  /** The WhatsApp order, offered alone where there is no cart. */
  orderHref?: string
  /** The shop takes its orders on WhatsApp, which the box says under the buttons. */
  finishesOnWhatsApp?: boolean
  seller?: { name: string; paymentMethods: readonly PaymentMethod[] }
  messages?: UiMessages
}

/**
 * 5b's buy box — the price, the stock, how many, the two pills, where the order finishes and who
 * sells it — and, on a phone, the bar that offers the same button until the box is reached.
 *
 * It promises only what exists: no postcode quote, no "Restam N" (a count is never public), no
 * favourites. The price here is not announced; the information column's is.
 */
export function StorefrontProductPurchase({
  name,
  priceCents,
  compareAtPriceCents,
  locale,
  showPrice,
  available,
  choosing,
  choiceKey,
  showStock = true,
  cart,
  onNotify,
  orderHref,
  finishesOnWhatsApp = false,
  seller,
  messages = defaultMessages,
}: StorefrontProductPurchaseProps) {
  const text = messages.storefront
  const [qty, setQty] = useState(1)
  // Which choice was put in the cart: after another flavour is chosen, "Comprar agora" adds that one.
  const [addedFor, setAddedFor] = useState<string | null>(null)
  const added = addedFor === choiceKey
  const anchor = useRef<HTMLDivElement>(null)
  const [ahead, setAhead] = useState(false)

  // The bar shows while the box's buttons are below the screen, and not once they have been reached.
  // The newest record wins: a fast fling can deliver several at once.
  useEffect(() => {
    const node = anchor.current
    if (!node || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1]
      if (entry) setAhead(!entry.isIntersecting && entry.boundingClientRect.top > 0)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  // While the bar is up, the page keeps its height clear at the bottom, so whatever Tab reaches is
  // scrolled above the bar rather than under it. The CSS applies it only where the bar shows.
  useEffect(() => {
    if (!ahead) return
    const root = document.documentElement
    root.dataset.buyBar = ""
    return () => {
      delete root.dataset.buyBar
    }
  }, [ahead])

  function add() {
    cart?.onAdd(qty)
    setAddedFor(choiceKey)
  }

  const act = available ? (cart ? add : undefined) : onNotify

  return (
    <>
      <StorefrontProductBuy messages={messages}>
        {showPrice ? <StorefrontPrice priceCents={priceCents} compareAtPriceCents={compareAtPriceCents} locale={locale} size="buyBox" messages={messages} /> : null}

        {available ? (
          showStock ? <p className="text-lg leading-[1.2] font-bold text-shop-positive-ink">{text.inStock}</p> : null
        ) : (
          <p className="text-lg leading-[1.2] font-bold text-shop-muted">{text.soldOut}</p>
        )}

        <div ref={anchor} className="flex flex-col gap-3.5">
          {!available ? (
            <>
              <p className="text-[13px] leading-[1.4] text-shop-muted">{choosing ? text.combinationSoldOut : text.soldOutHint}</p>
              {onNotify ? (
                <button type="button" onClick={onNotify} className={cn(BUY_PILL, "bg-shop-primary text-shop-on-primary")}>
                  {text.notifyMe}
                </button>
              ) : null}
            </>
          ) : cart ? (
            <StorefrontBuyActions name={name} qty={qty} onQtyChange={setQty} added={added} onAdd={add} cartHref={cart.href} messages={messages} />
          ) : orderHref ? (
            <a href={orderHref} rel="noreferrer" target="_blank" className={cn(BUY_PILL, "gap-2 bg-shop-primary text-shop-on-primary")}>
              <WhatsAppIcon className="size-5" />
              {text.orderThis}
            </a>
          ) : null}
        </div>

        {finishesOnWhatsApp ? (
          // Not the Alert primitive: it is role="alert", and this sentence is not news to announce.
          <p className="flex items-start gap-2 text-[13px] leading-[1.4] text-shop-muted">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="mt-px size-[18px] shrink-0 text-shop-positive-ink">
              <path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L4 20.5l1.1-4.2A8.5 8.5 0 1 1 21 12z" />
            </svg>
            {text.finishOnWhatsApp}
          </p>
        ) : null}

        {seller ? (
          <>
            <div aria-hidden="true" className="border-t border-shop-line" />
            <StorefrontSellerTable sellerName={seller.name} paymentMethods={seller.paymentMethods} messages={messages} />
          </>
        ) : null}
      </StorefrontProductBuy>

      {/* Outside the box: fixed, it takes no place in the grid, and it is not part of the region. */}
      {act ? (
        <StorefrontBuyBar
          shown={ahead}
          price={showPrice ? <StorefrontPrice priceCents={priceCents} compareAtPriceCents={compareAtPriceCents} locale={locale} size="compact" messages={messages} /> : undefined}
          label={available ? text.addToCart : text.notifyMe}
          onAct={act}
          cartHref={cart?.href}
          added={added}
          messages={messages}
        />
      ) : null}
    </>
  )
}
