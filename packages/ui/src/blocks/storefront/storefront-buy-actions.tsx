"use client"

// React
import { useState } from "react"

// Libs
import { MinusIcon, PlusIcon } from "lucide-react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { WhatsAppIcon } from "../store/store-brand-icons"

export interface StorefrontBuyActionsProps {
  /** The product's name, for the stepper's label and what a reader hears once it is added. */
  name: string
  /** Called with the quantity chosen; the web puts the chosen combination in the cart. */
  onAdd: (qty: number) => void
  /** The cart's address: "Comprar agora" adds, then goes there, and "Ver carrinho" follows an add. */
  cartHref: string
  /** Straight to the shop's WhatsApp with this product, for whoever would rather talk. */
  orderHref?: string
  maxQty?: number
  messages?: UiMessages
}

const STEP = "flex size-11 items-center justify-center disabled:opacity-40"

/**
 * The product page's way to buy: how many, "Adicionar ao carrinho", "Comprar agora" — which adds
 * and goes to the cart — and the WhatsApp order kept below as the quieter way.
 */
export function StorefrontBuyActions({ name, onAdd, cartHref, orderHref, maxQty = 99, messages = defaultMessages }: StorefrontBuyActionsProps) {
  const text = messages.storefront
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <div role="group" aria-label={`${text.cartQuantity}: ${name}`} className="flex shrink-0 items-center rounded-xl border border-current/25">
          <button type="button" aria-label={format(text.cartDecrease, { name })} disabled={qty <= 1} onClick={() => setQty(qty - 1)} className={STEP}>
            <MinusIcon aria-hidden="true" className="size-4" />
          </button>
          <span className="min-w-8 text-center text-base font-semibold tabular-nums">{qty}</span>
          <button type="button" aria-label={format(text.cartIncrease, { name })} disabled={qty >= maxQty} onClick={() => setQty(qty + 1)} className={STEP}>
            <PlusIcon aria-hidden="true" className="size-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            onAdd(qty)
            setAdded(true)
          }}
          className="flex-1 rounded-xl bg-shop-primary px-5 py-3 text-base font-semibold whitespace-nowrap text-shop-on-primary transition-opacity hover:opacity-90"
        >
          {text.addToCart}
        </button>
      </div>

      {/* A link, so the cart is an address; the add happens on the way, before the page leaves —
          once: after "Adicionar ao carrinho" the line is already there. */}
      <a
        href={cartHref}
        onClick={() => {
          if (!added) onAdd(qty)
        }}
        className="flex w-full items-center justify-center rounded-xl border-2 border-shop-primary px-5 py-3 text-base font-semibold text-shop-primary-ink"
      >
        {text.buyNow}
      </a>

      <p role="status" className="text-center text-sm empty:hidden">
        {added ? (
          <>
            {format(text.addedToCartStatus, { name })}{" "}
            <a href={cartHref} className="font-semibold text-shop-primary-ink underline">
              {text.viewCart}
            </a>
          </>
        ) : null}
      </p>

      {orderHref ? (
        <a href={orderHref} rel="noreferrer" target="_blank" className="inline-flex items-center justify-center gap-2 text-sm font-medium opacity-80 hover:opacity-100">
          <WhatsAppIcon className="size-4" />
          {text.orderThis}
        </a>
      ) : null}
    </div>
  )
}
