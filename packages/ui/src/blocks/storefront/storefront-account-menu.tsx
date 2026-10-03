// Libs
import { CoinsIcon, HeartIcon, HouseIcon, LogOutIcon, MessageCircleIcon, PackageIcon, StarIcon, UserRoundIcon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

/** The area's pages, in the design's order (6c). The overview is the area's own front. */
export type AccountMenuKey = "overview" | "orders" | "favorites" | "reviews" | "cashback" | "profile" | "messages"

export interface StorefrontAccountMenuItem {
  key: AccountMenuKey
  href: string
  /** A number beside the label: orders in progress, favourites, reviews waiting. */
  count?: number | null
}

export interface StorefrontAccountMenuProps {
  shopper: { name: string; contact: string | null }
  /** Only the pages that exist: a tab not delivered yet is not listed. */
  items: readonly StorefrontAccountMenuItem[]
  current: AccountMenuKey | null
  /** Where "Sair" posts. */
  signOutAction: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

const ICONS = {
  overview: HouseIcon,
  orders: PackageIcon,
  favorites: HeartIcon,
  reviews: StarIcon,
  cashback: CoinsIcon,
  profile: UserRoundIcon,
  messages: MessageCircleIcon,
} as const

const ITEM = "flex h-11 items-center gap-3 rounded-[10px] px-3 text-sm text-shop-on-background hover:bg-shop-fill"

/** "RS" for Rafael Souza: the first letter of the first and of the last word. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const first = words[0]?.[0] ?? ""
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : ""
  return `${first}${last}`.toUpperCase()
}

/**
 * The area's menu, as 6c draws it: who is signed in, then one entry per page, with its count when
 * there is one, and "Sair" under a rule. The same list is the phone's account home, where each
 * entry opens its own screen.
 */
export function StorefrontAccountMenu({ shopper, items, current, signOutAction, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontAccountMenuProps) {
  const text = messages.storefront
  const labels: Record<AccountMenuKey, string> = {
    overview: text.accountOverview,
    orders: text.accountOrders,
    favorites: text.accountFavorites,
    reviews: text.accountReviews,
    cashback: text.accountCashback,
    profile: text.accountProfile,
    messages: text.accountMessages,
  }

  // 6c's rule: the account's own pages above it, the conversation with the shop and "Sair" below.
  const above = items.filter((item) => item.key !== "messages")
  const below = items.filter((item) => item.key === "messages")
  const entry = ({ key, href, count }: StorefrontAccountMenuItem) => {
    const Icon = ICONS[key]
    const active = key === current
    return (
      <Link key={key} href={href} aria-current={active ? "page" : undefined} className={cn(ITEM, active && "bg-shop-primary-tint font-bold")}>
        <Icon aria-hidden="true" className="size-[18px] shrink-0" strokeWidth={1.8} />
        <span className="min-w-0 flex-1 truncate">{labels[key]}</span>
        {count ? (
          // Orders in progress ask for the shopper's eye; the other counts only say how many.
          <span
            className={cn(
              "shrink-0 tabular-nums",
              key === "orders" ? "flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-shop-primary px-1.5 text-xs font-bold text-shop-on-primary" : "text-[13px] text-shop-muted",
            )}
          >
            {count}
          </span>
        ) : null}
      </Link>
    )
  }

  return (
    <nav aria-label={text.account} className="flex flex-col gap-1">
      <div className="flex items-center gap-3 px-1 pb-4">
        <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-shop-primary font-extrabold text-shop-on-primary">
          {initialsOf(shopper.name)}
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-bold">{shopper.name}</span>
          {shopper.contact ? <span className="truncate text-[13px] text-shop-muted">{shopper.contact}</span> : null}
        </div>
      </div>

      {above.map(entry)}

      <div role="separator" className="my-2 h-px bg-shop-line" />

      {below.map(entry)}

      <form action={signOutAction} method="post" className="contents">
        <button type="submit" className={cn(ITEM, "w-full text-left")}>
          <LogOutIcon aria-hidden="true" className="size-[18px] shrink-0" strokeWidth={1.8} />
          {text.signOut}
        </button>
      </form>
    </nav>
  )
}
