"use client"

// React
import { useEffect, useState } from "react"

// Libs
import { CheckIcon, PlusIcon } from "lucide-react"

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
  /**
   * `pill` is the card's full-width action under its price. `icon` is the same action on a compact
   * card, which has no row to give it: a round "+" over the photo's corner, named for the product
   * since it draws no word.
   */
  size?: "pill" | "icon"
  messages?: UiMessages
}

const PILL = "flex h-[42px] w-full items-center justify-center gap-1.5 rounded-full text-sm font-semibold"
/** 44px: the least a finger takes without aiming (WCAG 2.5.5). Over a photo, so it carries its own shadow. */
const ROUND = "flex size-11 items-center justify-center rounded-full shadow-md"
/** "Ver opções" over a photo: a chip in the page's colour, where the pill's outline alone would be lost. */
const CHIP = "flex h-8 items-center rounded-full border border-shop-primary bg-shop-background px-3 text-xs font-semibold text-shop-primary-ink shadow-sm"

/**
 * The card's action, as 5a draws it: a pill in the shop's colour. A product without options goes
 * straight into the cart and says so for a moment; one with options cannot — the choice is made on
 * its page — so the pill only looks the part and a press falls through to the card's own link.
 *
 * On a compact card — the product page's "Você também pode gostar" — it is the same action as a
 * round "+" (`size="icon"`), and "Ver opções" as a chip: never a "+" that would open a page.
 */
export function StorefrontCardCartButton({ name, hasOptions, onAdd, size = "pill", messages = defaultMessages }: StorefrontCardCartButtonProps) {
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
      <span aria-hidden="true" className={cn("pointer-events-none", size === "icon" ? CHIP : cn(PILL, "border border-shop-primary text-shop-primary-ink"))}>
        {text.seeOptions}
      </span>
    )
  }

  const paint = "pointer-events-auto bg-shop-primary text-shop-on-primary transition-opacity hover:opacity-90"

  return (
    <>
      <button
        type="button"
        onClick={() => {
          onAdd()
          setAdded(true)
        }}
        // The round one draws no word: its name says what it adds, and "added" once it has.
        {...(size === "icon" ? { "aria-label": added ? text.addedToCart : format(text.addNamedToCart, { name }) } : {})}
        // Takes the pointer back from the card's action layer, which lets every other press through.
        className={cn(size === "icon" ? ROUND : PILL, paint)}
      >
        {size === "icon" ? (
          added ? <CheckIcon aria-hidden="true" className="size-5" /> : <PlusIcon aria-hidden="true" className="size-5" />
        ) : (
          <>
            {added ? <CheckIcon aria-hidden="true" className="size-4" /> : null}
            {added ? text.addedToCart : text.addToCart}
          </>
        )}
      </button>
      <span role="status" className="sr-only">
        {added ? format(text.addedToCartStatus, { name }) : ""}
      </span>
    </>
  )
}
