// Libs
import { HeartIcon, MessageCircleIcon, PackageIcon, StarIcon, UserRoundIcon } from "lucide-react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import type { AccountMenuKey } from "./storefront-account-menu"

export type AccountShortcutKey = Exclude<AccountMenuKey, "overview">

export interface StorefrontAccountShortcut {
  key: AccountShortcutKey
  href: string
  /** What the page holds, in one line; absent, the label stands alone. */
  hint?: string | null
}

export interface StorefrontAccountOverviewProps {
  name: string
  /** The pages that exist, as cards; a tab not delivered yet has no card. */
  shortcuts: readonly StorefrontAccountShortcut[]
  linkComponent?: LinkComponent
  messages?: UiMessages
}

const ICONS = { orders: PackageIcon, favorites: HeartIcon, reviews: StarIcon, profile: UserRoundIcon, messages: MessageCircleIcon } as const

/**
 * The area's front (6c), reduced to what exists: the greeting and a card per page. The order in
 * progress, the reviews to write and the favourites join it with their own tickets.
 */
export function StorefrontAccountOverview({ name, shortcuts, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontAccountOverviewProps) {
  const text = messages.storefront
  const labels: Record<AccountShortcutKey, string> = {
    orders: text.accountOrders,
    favorites: text.accountFavorites,
    reviews: text.accountReviews,
    profile: text.accountProfile,
    messages: text.accountMessages,
  }
  const first = name.trim().split(/\s+/)[0] ?? name

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold shop-lg:text-3xl">{format(text.accountHello, { name: first })}</h1>
      <ul className="grid gap-3 shop-md:grid-cols-2 shop-xl:grid-cols-3">
        {shortcuts.map(({ key, href, hint }) => {
          const Icon = ICONS[key]
          return (
            <li key={key}>
              <Link href={href} className="flex h-full items-center gap-4 rounded-2xl border border-shop-line bg-shop-background p-4 hover:border-shop-line-strong">
                <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-shop-primary-tint text-shop-primary-ink">
                  <Icon className="size-5" strokeWidth={1.8} />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-bold">{labels[key]}</span>
                  {hint ? <span className="text-[13px] text-shop-muted">{hint}</span> : null}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
