// Libs
import { CheckIcon } from "lucide-react"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import type { SubscriptionStandingView } from "@harness-monorepo/ui/lib/subscription"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface SubscriptionStandingProps {
  /** The plan's name, as the catalogue gives it; null where it holds no plan on sale. */
  plan: string | null
  standing: SubscriptionStandingView
  messages?: UiMessages
}

const BADGE: Record<SubscriptionStandingView["status"], "success" | "outline" | "destructive"> = {
  TRIALING: "outline",
  TRIAL_EXPIRED: "destructive",
  ACTIVE: "success",
  PAST_DUE: "destructive",
  SUSPENDED: "destructive",
  CANCELED: "outline",
}

/** Where the page stands, in one sentence: its trial and what is left of it, until when it is paid, or what went wrong. */
export function standingSentenceOf(standing: SubscriptionStandingView, text: UiMessages["subscription"]["standing"]): string {
  switch (standing.status) {
    case "TRIALING":
      if (standing.daysLeft > 1) return format(text.trialingMany, { date: standing.lastDay, days: String(standing.daysLeft) })
      return format(standing.daysLeft === 1 ? text.trialingOne : text.trialingToday, { date: standing.lastDay })
    case "TRIAL_EXPIRED":
      return format(text.trialExpired, { date: standing.lastDay })
    case "ACTIVE":
      return standing.paidUntil ? format(text.active, { date: standing.paidUntil }) : text.activeUndated
    case "PAST_DUE":
      return standing.endedOn ? format(text.pastDue, { date: standing.endedOn }) : text.pastDueUndated
    case "SUSPENDED":
      return text.suspended
    case "CANCELED":
      return standing.until ? format(text.canceledUntil, { date: standing.until }) : text.canceled
  }
}

/**
 * The top of the Assinar screen (BEELINK-293): the page's title — the plan's name — where the page
 * stands as a badge and a sentence, and that the plan is the page's own. It is the page's `h1`.
 */
export function SubscriptionStanding({ plan, standing, messages = defaultMessages }: SubscriptionStandingProps) {
  const text = messages.subscription

  return (
    <header className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{plan ? format(text.title, { plan }) : text.untitled}</h1>
        <Badge variant={BADGE[standing.status]}>
          {standing.status === "ACTIVE" ? <CheckIcon aria-hidden="true" /> : null}
          {text.badges[standing.status]}
        </Badge>
      </div>
      <p className="text-sm">{standingSentenceOf(standing, text.standing)}</p>
      <p className="text-muted-foreground text-sm">{text.lead}</p>
    </header>
  )
}
