// React
import type { ReactNode } from "react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { BUY_PILL } from "./storefront-buy-actions"

export interface StorefrontBuyBarProps {
  /** Whether the buy box's own buttons are still ahead, below the screen. */
  shown: boolean
  /** The compact price; absent when the shop hides prices. */
  price?: ReactNode
  /** "Adicionar ao carrinho", or "Avise-me quando chegar" for a sold-out combination. */
  label: string
  onAct: () => void
  /** Set once added, for "Adicionado · Ver carrinho": the box's own line is off screen. */
  cartHref?: string
  added?: boolean
  messages?: UiMessages
}

/**
 * A phone's way to buy without scrolling to the box: the price and one pill, fixed to the bottom
 * while the box's buttons are still below, gone once they are on screen and for the rest of the page
 * — so it never covers the lower sections or the footer.
 *
 * Fixed rather than in the flow: showing and hiding it moves nothing, so there is no layout shift.
 * It is in the server's HTML hidden and inert — `aria-hidden` too, for a browser without `inert` — and a
 * script decides when it shows.
 */
export function StorefrontBuyBar({ shown, price, label, onAct, cartHref, added = false, messages = defaultMessages }: StorefrontBuyBarProps) {
  const text = messages.storefront

  return (
    <div
      inert={!shown}
      aria-hidden={!shown}
      className={cn(
        // Under the header (z-30), so its search suggestions are never painted over.
        "fixed inset-x-0 bottom-0 z-20 flex flex-col gap-2 border-t border-shop-line bg-shop-background px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] text-shop-on-background transition-transform duration-200 motion-reduce:transition-none shop-lg:hidden",
        shown ? "translate-y-0" : "invisible translate-y-full",
      )}
    >
      <div className="flex items-center gap-3">
        {price ? <div className="min-w-0 shrink-0">{price}</div> : null}
        <button type="button" onClick={onAct} className={cn(BUY_PILL, "min-w-0 flex-1 bg-shop-primary text-shop-on-primary")}>
          {label}
        </button>
      </div>
      {/* Plain text: the box's line already says it to a screen reader. */}
      {added && cartHref ? (
        <p className="text-center text-[13px]">
          {text.addedShort} ·{" "}
          <a href={cartHref} className="font-semibold text-shop-primary-ink underline">
            {text.viewCart}
          </a>
        </p>
      ) : null}
    </div>
  )
}
