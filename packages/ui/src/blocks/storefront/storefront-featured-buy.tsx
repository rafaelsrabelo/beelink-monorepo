"use client"

// React
import { useState } from "react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { BUY_PILL } from "./storefront-buy-actions"

export interface StorefrontFeaturedBuyProps {
  name: string
  productHref: string
  /** The cart's address, or null where the page cannot reach one: a landing without the shop's header. */
  cartHref: string | null
  /** Known false only on a product without options: that one goes in with no choice to make. */
  hasOptions?: boolean
  soldOut: boolean
  /** Puts the product in the cart; the press then follows the link to it. */
  onBuy?: () => void
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The featured product's button: into the cart and on to it when the product needs no choice; to
 * its page to choose when it has options; to its page when it is sold out, where "Avise-me" is; and
 * to its page when the cart cannot be reached from here.
 *
 * Always a link, so it goes somewhere without a script. The script only adds the product on the way.
 */
export function StorefrontFeaturedBuy({
  name,
  productHref,
  cartHref,
  hasOptions,
  soldOut,
  onBuy,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontFeaturedBuyProps) {
  const text = messages.storefront
  const [bought, setBought] = useState(false)
  const straight = !soldOut && hasOptions === false && cartHref !== null && onBuy !== undefined

  if (straight) {
    return (
      <>
        <Link
          href={cartHref}
          onClick={() => {
            onBuy()
            setBought(true)
          }}
          className={cn(BUY_PILL, "bg-shop-primary text-shop-on-primary")}
        >
          {text.buyNow}
        </Link>
        <span role="status" className="sr-only">
          {bought ? format(text.addedToCartStatus, { name }) : ""}
        </span>
      </>
    )
  }

  return (
    <Link
      href={productHref}
      className={cn(
        BUY_PILL,
        soldOut || hasOptions !== false ? "border-2 border-shop-primary bg-shop-background text-shop-primary-ink" : "bg-shop-primary text-shop-on-primary",
      )}
    >
      {soldOut ? text.seeProduct : hasOptions !== false ? text.seeOptions : text.buyNow}
    </Link>
  )
}
