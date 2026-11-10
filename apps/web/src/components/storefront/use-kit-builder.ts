"use client"

// React
import { useMemo, useState } from "react"

// Types
import type { StorefrontKitParts } from "@harness-monorepo/contracts"
import type { StorefrontKitBuilderPart } from "@harness-monorepo/ui/blocks/storefront/storefront-kit-builder"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { format } from "@harness-monorepo/ui/locales/index"

// App
import { kitKeyOf, type CartKitPart } from "@/lib/cart-cookie"

export interface KitBuilderHandle {
  size: number
  parts: StorefrontKitBuilderPart[]
  /** How many of each product are in the kit now, by product id. */
  counts: Readonly<Record<string, number>>
  setCount: (productId: string, count: number) => void
  /** What goes in the cart's line: the products chosen, by product, and how many of each. */
  chosen: CartKitPart[]
  /** What is still missing, in the buy box's words; null once the kit is whole. */
  incomplete: string | null
  /** What is chosen now: an add counts for this choice and no other. */
  key: string
}

/**
 * A kit being put together on its page (plan 2026-11-10--kits-monte-seu-kit): how many of each
 * product, never past the kit's size and never of one that ran out, and what the cart's line will
 * carry. Null for a product that is no kit.
 */
export function useKitBuilder(kit: StorefrontKitParts | null, text: UiMessages["storefront"]): KitBuilderHandle | null {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const size = kit?.size ?? 0
  const parts = useMemo(() => (kit?.parts ?? []).map((part) => ({ key: part.productId, name: part.name, imageUrl: part.imageUrl, available: part.available })), [kit])
  const chosen = useMemo(() => parts.flatMap((part) => ((counts[part.key] ?? 0) > 0 ? [{ productId: part.key, qty: counts[part.key]! }] : [])), [parts, counts])

  if (!kit) return null
  const total = chosen.reduce((sum, part) => sum + part.qty, 0)
  const missing = size - total

  function setCount(productId: string, count: number) {
    const part = parts.find((entry) => entry.key === productId)
    if (!part) return
    const room = size - (total - (counts[productId] ?? 0))
    // More of one that ran out is refused; less of it is not, so a choice made before it ran out can be undone.
    const next = Math.max(0, Math.min(count, part.available ? room : (counts[productId] ?? 0)))
    setCounts((now) => ({ ...now, [productId]: next }))
  }

  return {
    size,
    parts,
    counts,
    setCount,
    chosen,
    incomplete: missing <= 0 ? null : missing === 1 ? text.kitMissingOne : format(text.kitMissing, { count: String(missing) }),
    key: `kit:${kitKeyOf(chosen)}`,
  }
}
