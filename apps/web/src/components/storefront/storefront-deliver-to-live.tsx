"use client"

// React
import { useSyncExternalStore } from "react"

// UI
import { StorefrontDeliverTo } from "@harness-monorepo/ui/blocks/storefront/storefront-deliver-to"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { cepDigitsOf } from "@/lib/saved-address"
import { cepFromCookies, shopPrefsCookieOf } from "@/lib/shop-prefs-cookie"

/** Said when this tab keeps a new CEP, so the block reads the cookie again. */
const CHANGED = "bl-shop-prefs"

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGED, onChange)
  return () => window.removeEventListener(CHANGED, onChange)
}

export interface StorefrontDeliverToLiveProps {
  slug: string
  /** The signed-in shopper's default address's CEP, as the record keeps it, until they type another; null for a visitor. */
  defaultCep?: string | null
  messages: UiMessages
}

/**
 * "Entregar em", keeping the visitor's CEP in the shop's own cookie. The server draws the invitation,
 * having no cookie to read — the page stays cacheable — and the browser draws the CEP kept. A
 * signed-in shopper's default address stands in until they type a CEP: that one is their choice for
 * this visit, and is kept over it.
 */
export function StorefrontDeliverToLive({ slug, defaultCep = null, messages }: StorefrontDeliverToLiveProps) {
  const cep = useSyncExternalStore(subscribe, () => cepFromCookies(document.cookie), () => null) ?? cepDigitsOf(defaultCep)

  return (
    <StorefrontDeliverTo
      cep={cep}
      onSave={(next) => {
        document.cookie = shopPrefsCookieOf(slug, next, window.location.protocol === "https:")
        window.dispatchEvent(new Event(CHANGED))
      }}
      messages={messages}
    />
  )
}
