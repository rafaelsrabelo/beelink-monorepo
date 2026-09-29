// Libs
import { RotateCcwIcon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontReorderButtonProps {
  /** The shop's handler that puts the order in the cart and goes there. */
  action: string
  /** "Comprar de novo" on a card; "Comprar tudo de novo", the width of its column, under an order's lines. */
  variant?: "card" | "all"
  messages?: UiMessages
}

/**
 * Buying an order again (J6), as a form: it works before any script has loaded, and the browser
 * lands on the cart the handler sends it to.
 */
export function StorefrontReorderButton({ action, variant = "card", messages = defaultMessages }: StorefrontReorderButtonProps) {
  const text = messages.storefront
  const all = variant === "all"

  return (
    <form action={action} method="post" className={cn(all && "w-full")}>
      <button
        type="submit"
        className={cn(
          "flex h-10 items-center justify-center gap-2 rounded-full border border-shop-line-strong bg-shop-background px-4 text-sm font-semibold text-shop-on-background hover:bg-shop-fill",
          all && "w-full",
        )}
      >
        <RotateCcwIcon aria-hidden="true" className="size-4" />
        {all ? text.reorderAll : text.reorder}
      </button>
    </form>
  )
}
