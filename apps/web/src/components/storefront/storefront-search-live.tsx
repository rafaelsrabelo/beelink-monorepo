"use client"

// React
import { useState } from "react"

// Types
import type { StorefrontRouteWords } from "@harness-monorepo/contracts"

// UI
import {
  StorefrontSearchCombobox,
  type StorefrontSuggestion,
} from "@harness-monorepo/ui/blocks/storefront/storefront-search-combobox"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { useDebouncedValue } from "@/services/addresses/use-debounced-value"
import { DEBOUNCE_MS, useStorefrontSearch } from "@/services/storefront/storefront-hooks"
import { storefrontRoutes } from "@/lib/storefront-routes"

export interface StorefrontSearchLiveProps {
  slug: string
  /**
   * Plain data, because this crosses into the browser. The routes are rebuilt here from the words
   * rather than handed over ready-made: a function cannot be serialised into a client component,
   * and the alternative — spelling the segment here — is the literal the whole scheme keeps out.
   */
  routeWords: StorefrontRouteWords
  initialTerm?: string
  autoFocus?: boolean
  locale: string
  messages: UiMessages
}

/**
 * The shop's search, answering while someone types.
 *
 * The block under it is presentational and the request lives in `services/storefront` — this is
 * the seam between them, and the only part of the shop window that runs in the browser. The search
 * page is still where Enter goes, and still works with none of this: what is added here is the
 * shortcut, never the feature.
 */
export function StorefrontSearchLive({
  slug,
  routeWords,
  initialTerm = "",
  autoFocus = false,
  locale,
  messages,
}: StorefrontSearchLiveProps) {
  const [term, setTerm] = useState(initialTerm)
  const settled = useDebouncedValue(term, DEBOUNCE_MS)
  const { products, total, pending } = useStorefrontSearch(slug, settled)

  const routes = storefrontRoutes({ slug, routeWords })
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" })

  // Formatted here and not in the block: what money looks like is a decision about a locale, and a
  // block that formatted it would need to know which one before it could render a price.
  const suggestions: StorefrontSuggestion[] = products.map((product) => ({
    id: product.id,
    label: product.name,
    href: routes.product(product.slug),
    imageUrl: product.imageUrl,
    price: money.format(product.priceCents / 100),
  }))

  return (
    <StorefrontSearchCombobox
      action={routes.search()}
      value={term}
      onValueChange={setTerm}
      suggestions={suggestions}
      pending={pending}
      total={total}
      seeAllHref={routes.search(settled)}
      autoFocus={autoFocus}
      tone="panel"
      messages={messages}
    />
  )
}
