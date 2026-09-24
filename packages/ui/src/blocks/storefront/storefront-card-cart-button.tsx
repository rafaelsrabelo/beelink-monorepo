"use client"

// React
import { useEffect, useState } from "react"

// Libs
import { CheckIcon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontCardCartButtonProps {
  /** The product's name, for what a reader hears once it is in the cart. */
  name: string
  /** Known false only on a product without options: that one a card can add without a choice. */
  hasOptions?: boolean
  onAdd?: () => void
  messages?: UiMessages
}

const PILL = "flex h-[42px] w-full items-center justify-center gap-1.5 rounded-full text-sm font-semibold"

/**
 * The card's action, as 5a draws it: a pill in the shop's colour. A product without options goes
 * straight into the cart and says so for a moment; one with options cannot — the choice is made on
 * its page — so the pill only looks the part and a press falls through to the card's own link.
 */
export function StorefrontCardCartButton({ name, hasOptions, onAdd, messages = defaultMessages }: StorefrontCardCartButtonProps) {
  const text = messages.storefront
  const [added, setAdded] = useState(false)

  useEffect(() => {
    if (!added) return
    const timer = window.setTimeout(() => setAdded(false), 2000)
    return () => window.clearTimeout(timer)
  }, [added])

  if (hasOptions !== false || !onAdd) {
    // Not a second link to the same page: the card's name already is one, stretched over the card.
    return (
      <span aria-hidden="true" className={cn(PILL, "pointer-events-none border border-shop-primary text-shop-primary-ink")}>
        {text.seeOptions}
      </span>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          onAdd()
          setAdded(true)
        }}
        className={cn(PILL, "bg-shop-primary text-shop-on-primary transition-opacity hover:opacity-90")}
      >
        {added ? <CheckIcon aria-hidden="true" className="size-4" /> : null}
        {added ? text.addedToCart : text.addToCart}
      </button>
      <span role="status" className="sr-only">
        {added ? format(text.addedToCartStatus, { name }) : ""}
      </span>
    </>
  )
}
