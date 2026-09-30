// Libs
import { HeartIcon, RefreshCwIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontFavoritesEmptyProps {
  /**
   * Never liked anything, nothing under the filter chosen, or a list that could not be read — each a
   * different sentence and a different door. A failed read is never told as an empty list.
   */
  variant: "none" | "filtered" | "unavailable"
  /** The shop's shelf, the list with its filter cleared, or this very address to read it again. */
  href: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** Favoritos with nothing to show says why, and where to go: an invitation to like, never a blank grid. */
export function StorefrontFavoritesEmpty({ variant, href, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontFavoritesEmptyProps) {
  const text = messages.storefront
  const words = {
    none: { sentence: text.favoritesEmpty, door: text.favoritesEmptyCta },
    filtered: { sentence: text.favoritesNoResults, door: text.favoritesClear },
    unavailable: { sentence: text.favoritesUnavailable, door: text.favoritesRetry },
  }[variant]
  const failed = variant === "unavailable"
  const Icon = failed ? RefreshCwIcon : HeartIcon

  return (
    <section className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-shop-line px-6 py-14 text-center">
      <Icon aria-hidden="true" className="size-9 text-shop-muted" strokeWidth={1.5} />
      <p role={failed ? "alert" : undefined} className="max-w-md font-semibold">
        {words.sentence}
      </p>
      <Link href={href} className="mt-1 rounded-[10px] bg-shop-primary px-4 py-2 text-sm font-semibold text-shop-on-primary">
        {words.door}
      </Link>
    </section>
  )
}
