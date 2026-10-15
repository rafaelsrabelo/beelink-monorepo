// Types
import type { StoreSubscriptionAnswer } from "@harness-monorepo/contracts"
import type { SubscriptionCardStanding, SubscriptionStandingView } from "@harness-monorepo/ui/lib/subscription"

// App
import { pageLockOf, pageStripOf } from "./page-lock-view"
import { subscribeViewOf } from "./subscribe-view"

/**
 * What the plan's card in the panel's menu says of the open page (BEELINK-220), before the catalogue
 * and the account have their say.
 *
 * - `plan`: the plan the page chose, by name; null while it chose none — the plan on sale is then the
 *   one it is trying, which the catalogue names.
 * - `warning`: why the card would warn. `lock` is the page locked, which the API only ever says where
 *   pages lock; `strip` is what the strip over the panel warns of — the last days of a trial or a free
 *   time, a renewal unpaid inside its grace — and is said only where the page can lock, which the
 *   account's billing read tells, as it tells the strip.
 */
export interface PlanCardReading {
  standing: SubscriptionCardStanding
  plan: string | null
  warning: "lock" | "strip" | null
}

/** The Assinar screen's reading, in the card's fewer words: a renewal unpaid is overdue whether or not its grace ran out. */
function cardStandingOf(standing: SubscriptionStandingView): SubscriptionCardStanding {
  switch (standing.status) {
    case "FREE":
      return { status: "FREE", lastDay: standing.lastDay, daysLeft: standing.daysLeft }
    case "TRIALING":
      return { status: "TRIALING", daysLeft: standing.daysLeft }
    case "TRIAL_EXPIRED":
      return { status: "TRIAL_EXPIRED" }
    case "ACTIVE":
      return { status: "ACTIVE", renewsOn: standing.paidUntil }
    case "PAST_DUE":
    case "SUSPENDED":
      return { status: "PAST_DUE" }
    case "CANCELED":
      return { status: "CANCELED", until: standing.until }
  }
}

/**
 * The card, or null wherever the panel says nothing of a plan: billing off, a page owing nothing, one
 * with no subscription. Nothing is worked out here: where the page stands is the Assinar screen's own
 * reading (`subscribeViewOf` — a free time told before the status, for a page that never paid), the lock
 * is the API's (`pageLockOf`) and what warns is the strip's (`pageStripOf`), so the card never says other
 * than the screen it leads to, the notice or the strip.
 */
export function planCardOf(answer: StoreSubscriptionAnswer, now: Date, locale: string): PlanCardReading | null {
  const view = subscribeViewOf(answer, now, locale)
  if (view.kind === "leave" || answer.subscription === null) return null

  const plan = answer.subscription.plan?.name ?? null
  if (pageLockOf(answer, locale) !== null) return { standing: { status: "LOCKED" }, plan, warning: "lock" }
  return { standing: cardStandingOf(view.standing), plan, warning: pageStripOf(answer, locale) !== null ? "strip" : null }
}
