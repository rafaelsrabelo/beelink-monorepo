"use client"

// React
import { useId, useState } from "react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { WhatsAppIcon } from "../store/store-brand-icons"

export interface StorefrontCheckoutProps {
  /**
   * The order's `wa.me` link for the name typed so far, or null when the shop has no WhatsApp —
   * then there is no button, and a sentence says why.
   */
  hrefFor: ((customerName: string) => string) | null
  /** Nothing in the cart can be ordered now: the button stays, and does nothing until it can. */
  disabled?: boolean
  /** Told as the link opens, with the link: the page empties the cart and keeps it for a retry. */
  onSend?: (href: string) => void
  messages?: UiMessages
}

/**
 * The way out of the cart, under the subtotal: an optional name and "Fechar pedido pelo WhatsApp".
 * The order ends on the shop's WhatsApp, as the product page has always said — there is no payment
 * here, and nothing pretends there is.
 */
export function StorefrontCheckout({ hrefFor, disabled = false, onSend, messages = defaultMessages }: StorefrontCheckoutProps) {
  const text = messages.storefront
  const id = useId()
  const [name, setName] = useState("")

  if (!hrefFor) return <p className="text-sm text-shop-muted">{text.checkoutNoWhatsApp}</p>

  const href = hrefFor(name)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="text-xs text-shop-muted">
          {text.checkoutName}
        </label>
        <input
          id={id}
          value={name}
          autoComplete="name"
          onChange={(event) => setName(event.target.value)}
          className="h-10 rounded-[10px] border border-shop-line-strong bg-shop-background px-3 text-sm text-shop-on-background"
        />
      </div>
      {disabled ? (
        <button type="button" disabled className="flex h-12 items-center justify-center gap-2 rounded-xl bg-shop-primary text-base font-semibold text-shop-on-primary opacity-50">
          <WhatsAppIcon className="size-5" />
          {text.checkoutWhatsApp}
        </button>
      ) : (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          onClick={() => onSend?.(href)}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-shop-primary text-base font-semibold text-shop-on-primary transition-opacity hover:opacity-90"
        >
          <WhatsAppIcon className="size-5" />
          {text.checkoutWhatsApp}
        </a>
      )}
    </div>
  )
}
