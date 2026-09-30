// Libs
import { HeartIcon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontFavoriteButtonProps {
  /** The product's, so each heart on a grid says which product it likes. */
  name: string
  liked: boolean
  /** `icon` sits on a photo; `text` is the buy box's "Adicionar aos favoritos". */
  look?: "icon" | "text"
  /** Signed out: where signing in starts, and comes back from with the product liked. The heart is then a link. */
  signInHref?: string
  onToggle?: () => void
  /** While the liked products are still being read, a press would guess. */
  disabled?: boolean
  linkComponent?: LinkComponent
  messages?: UiMessages
}

const LOOKS = {
  icon: "flex size-11 items-center justify-center rounded-full border border-shop-line bg-shop-background text-shop-primary-ink shadow-sm",
  text: "flex h-11 w-full items-center justify-center gap-2 rounded-full border border-shop-line-strong bg-shop-background px-4 text-sm font-semibold text-shop-on-background",
} as const

/**
 * The heart (5b, 6g): a toggle for a signed-in shopper, filled in the shop's colour once liked, and
 * a link to sign in for anyone else. It knows nothing of who is looking or what is liked — the
 * screen says both — so a page drawn for everyone can carry it.
 */
export function StorefrontFavoriteButton({
  name,
  liked,
  look = "icon",
  signInHref,
  onToggle,
  disabled = false,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontFavoriteButtonProps) {
  const text = messages.storefront
  const heart = <HeartIcon aria-hidden="true" className={cn("size-5 shrink-0", look === "text" && "text-shop-primary-ink")} fill={liked ? "currentColor" : "none"} strokeWidth={1.8} />
  const words = look === "text" ? <span>{liked ? text.favoriteSavedText : text.favoriteAddText}</span> : null

  if (signInHref !== undefined) {
    return (
      <Link href={signInHref} aria-label={look === "icon" ? format(text.favoriteSignIn, { name }) : undefined} className={cn(LOOKS[look], "pointer-events-auto")}>
        {heart}
        {words}
      </Link>
    )
  }

  return (
    <button
      type="button"
      // The words already say the state ("Nos seus favoritos"); pressed on top would say it twice.
      aria-pressed={look === "icon" ? liked : undefined}
      aria-label={look === "icon" ? format(text.favoriteToggle, { name }) : undefined}
      disabled={disabled}
      onClick={onToggle}
      className={cn(LOOKS[look], "pointer-events-auto cursor-pointer disabled:cursor-default disabled:opacity-60")}
    >
      {heart}
      {words}
    </button>
  )
}
