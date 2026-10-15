// Libs
import { BadgeCheckIcon, CalendarXIcon, ChevronRightIcon, ClockIcon, GiftIcon, LockIcon, TriangleAlertIcon, type LucideIcon } from "lucide-react"

// UI
import type { SubscriptionCardStanding, SubscriptionCardView } from "@harness-monorepo/ui/lib/subscription"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { AdminPlanCardSkeleton } from "./admin-plan-card-skeleton"

export interface AdminPlanCardProps {
  /** Null while the open page's plan is read: the card's skeleton, in its place. */
  view: SubscriptionCardView | null
  /** The page's Assinar screen, where its plan is chosen and paid. */
  href: string
  /** The Assinar screen is the page open now. */
  current?: boolean
  /** The rail is icons only, above `lg` — `AdminSidebar`'s own flag, scoped as its classes are. */
  collapsed?: boolean
  /** Called as the card is chosen: the drawer closes, as it does for an item. */
  onNavigate?: () => void
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** Where the page stands, in the card's few words: two days or more, tomorrow and today for a trial or a free time. */
export function cardSentenceOf(standing: SubscriptionCardStanding, text: UiMessages["subscription"]["card"]): string {
  switch (standing.status) {
    case "FREE":
      if (standing.daysLeft > 1) return format(text.freeMany, { date: standing.lastDay })
      return standing.daysLeft === 1 ? text.freeOne : text.freeToday
    case "TRIALING":
      if (standing.daysLeft > 1) return format(text.trialMany, { days: String(standing.daysLeft) })
      return standing.daysLeft === 1 ? text.trialOne : text.trialToday
    case "TRIAL_EXPIRED":
      return text.trialOver
    case "ACTIVE":
      return standing.renewsOn ? format(text.renews, { date: standing.renewsOn }) : text.active
    case "PAST_DUE":
      return text.pastDue
    case "CANCELED":
      return standing.until ? format(text.canceledUntil, { date: standing.until }) : text.canceled
    case "LOCKED":
      return text.locked
  }
}

/** One for each standing: with the rail icons only, the icon is all that is seen of the card. */
const ICONS: Record<SubscriptionCardStanding["status"], LucideIcon> = {
  FREE: GiftIcon,
  TRIALING: ClockIcon,
  TRIAL_EXPIRED: ClockIcon,
  ACTIVE: BadgeCheckIcon,
  PAST_DUE: TriangleAlertIcon,
  CANCELED: CalendarXIcon,
  LOCKED: LockIcon,
}

/**
 * The open page's plan in the panel's menu (BEELINK-220): the plan's name, where the page stands in a few
 * words, and the way to its Assinar screen — the whole card one link, so the rail keeps one tab stop for
 * it. Its name is the two lines, read the same with the rail open or collapsed: collapsed, the words are
 * hidden from sight and not from the accessibility tree (`lg:sr-only`, as an item's), and `title` gives a
 * pointer user them back. Nothing is announced when the standing moves — a payment, a coupon, the lock —
 * as a count is not: a menu that speaks by itself is one people mute.
 *
 * `urgent` is said in the warning's colours, which also keep their square when the rail is collapsed; a
 * card with nothing pressing collapses to an item's bare icon.
 */
export function AdminPlanCard({ view, href, current = false, collapsed = false, onNavigate, linkComponent: Link = AnchorLink, messages = defaultMessages }: AdminPlanCardProps) {
  if (view === null) return <AdminPlanCardSkeleton collapsed={collapsed} />

  const text = messages.subscription
  const title = view.plan ? format(text.title, { plan: view.plan }) : text.untitled
  const sentence = cardSentenceOf(view.standing, text.card)
  const Icon = ICONS[view.standing.status]
  const quiet = collapsed && !view.urgent

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={current ? "page" : undefined}
      title={collapsed ? `${title}, ${sentence}` : undefined}
      data-slot="plan-card"
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-[7px] py-2 text-[13px] transition-colors",
        "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2",
        view.urgent
          ? "bg-warning text-warning-foreground border-warning-foreground/20 hover:border-warning-foreground/45"
          : "bg-shell-surface text-shell-text border-shell-border hover:bg-nav-hover",
        current && "shadow-xs",
        collapsed && "lg:items-center lg:justify-center lg:px-0 lg:py-[7px]",
        quiet && "lg:hover:bg-nav-hover lg:border-transparent lg:bg-transparent",
        quiet && current && "lg:bg-nav-active",
      )}
    >
      <span aria-hidden="true" className={cn("mt-px shrink-0 [&>svg]:size-[18px]", !view.urgent && "text-shell-muted", collapsed && "lg:mt-0")}>
        <Icon />
      </span>
      <span className={cn("flex min-w-0 flex-1 flex-col", collapsed && "lg:sr-only")}>
        {/*
          The comma is heard and not seen: the two lines are one name, and a pause between them reads as
          one. The space after it stands between the lines, where a flex box draws nothing — at the end of
          the first line it would be trimmed from the name.
        */}
        <span className="truncate font-semibold">
          {title}
          <span className="sr-only">,</span>
        </span>{" "}
        <span className={cn("text-xs", !view.urgent && "text-shell-muted")}>{sentence}</span>
      </span>
      <ChevronRightIcon aria-hidden="true" className={cn("size-4 shrink-0 self-center opacity-70", collapsed && "lg:hidden")} />
    </Link>
  )
}
