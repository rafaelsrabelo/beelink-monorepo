"use client"

// React
import { useSyncExternalStore } from "react"

// UI
import { StorefrontDeliverTo } from "@harness-monorepo/ui/blocks/storefront/storefront-deliver-to"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { cepFromCookies, shopPrefsCookieOf } from "@/lib/shop-prefs-cookie"

/** Said when this tab keeps a new CEP, so the block reads the cookie again. */
const CHANGED = "bl-shop-prefs"

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGED, onChange)
  return () => window.removeEventListener(CHANGED, onChange)
}

export interface StorefrontDeliverToLiveProps {
  slug: string
  messages: UiMessages
}

/**
 * "Entregar em", keeping the visitor's CEP in the shop's own cookie. The server draws the invitation,
 * having no cookie to read — the page stays cacheable — and the browser draws the CEP kept.
 */
export function StorefrontDeliverToLive({ slug, messages }: StorefrontDeliverToLiveProps) {
  const cep = useSyncExternalStore(subscribe, () => cepFromCookies(document.cookie), () => null)

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
