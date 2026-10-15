// Types
import type { StoreSubscription, StoreSubscriptionAnswer } from "@harness-monorepo/contracts"
import type { SubscriptionLockValue, SubscriptionStripView } from "@harness-monorepo/ui/lib/subscription"

// App
import { subscribePageOf } from "./subscribe-view"
import { dayInWords, lastDayBefore } from "./subscription-dates"

/*
  A locked page's panel and the strips before it locks (BEELINK-296), from the page's subscription as
  the API reads it. Nothing of the lock's rule is here: `lock` is the API's answer (BEELINK-223), worked
  out at the read by the rule its guard applies, and null wherever nothing locks — billing switched off,
  or no Asaas account of bee-link's to pay at.
*/

/** How many days before its last one a trial or a free time carries the strip: two, tomorrow and today. */
export const STRIP_DAYS = 2

/** The page a panel address belongs to — `/admin/<slug>/…` — or null on the panel's other pages. */
export function pageSlugOf(pathname: string): string | null {
  return pathname.match(/^\/admin\/([^/]+)/)?.[1] ?? null
}

/** Whether the address is the page's Assinar screen: the way out of a lock, which nothing covers. */
export function isSubscribePage(pathname: string, slug: string): boolean {
  const page = subscribePageOf(slug)
  return pathname === page || pathname.startsWith(`${page}/`)
}

/** Why a page is locked as its owner is told, and the day it happened, in words. */
export interface PageLockView {
  reason: SubscriptionLockValue
  endedOn: string | null
}

/** The last day an end — an exclusive instant — covered, in words; null with none. */
function lastDayInWords(endsAt: string | null, locale: string): string | null {
  return endsAt ? dayInWords(lastDayBefore(endsAt), locale) : null
}

/**
 * Why the page's panel is closed, or null while it is open. A page that never paid and whose free time —
 * a coupon's month, or the one the pages of 13/10/2026 were given — ran out is locked by the API as a
 * trial that ended, and told it was the free month: a free time always ends after the trial (BEELINK-224).
 */
export function pageLockOf(answer: StoreSubscriptionAnswer | undefined, locale: string): PageLockView | null {
  const subscription = answer?.billingEnforced ? answer.subscription : null
  if (!subscription) return null

  switch (subscription.lock) {
    case "TRIAL_EXPIRED":
      return subscription.freePeriodLastDay !== null
        ? { reason: "FREE_PERIOD_OVER", endedOn: dayInWords(subscription.freePeriodLastDay, locale) }
        : { reason: "TRIAL_EXPIRED", endedOn: dayInWords(subscription.trialLastDay, locale) }
    case "SUSPENDED":
      return { reason: "SUSPENDED", endedOn: lastDayInWords(subscription.graceEndsAt, locale) }
    case "CANCELED":
      return { reason: "CANCELED", endedOn: lastDayInWords(subscription.currentPeriodEndsAt, locale) }
    case null:
      return null
  }
}

/** The page never paid: in its trial, or with the trial over and perhaps a free time running. */
const neverPaid = (subscription: StoreSubscription) => subscription.status === "TRIALING" || subscription.status === "TRIAL_EXPIRED"

/**
 * The strip over the panel of a page about to lock, or null. A free time is looked at before the trial,
 * as the Assinar screen does (BEELINK-224): a page in it does not lock when its trial ends, and the
 * trial's strip would lie to it. A page past due inside its grace is told the grace's last day — the day
 * before `graceEndsAt`, the instant the lock and the e-mails read. A locked page has its notice instead.
 */
export function pageStripOf(answer: StoreSubscriptionAnswer | undefined, locale: string): SubscriptionStripView | null {
  const subscription = answer?.billingEnforced ? answer.subscription : null
  if (!subscription || subscription.lock !== null) return null

  const { freePeriodDaysLeft, freePeriodLastDay } = subscription
  if (neverPaid(subscription) && freePeriodDaysLeft !== null && freePeriodLastDay !== null) {
    return freePeriodDaysLeft <= STRIP_DAYS ? { kind: "free", daysLeft: freePeriodDaysLeft, lastDay: dayInWords(freePeriodLastDay, locale) } : null
  }
  if (subscription.status === "TRIALING") {
    return subscription.trialDaysLeft <= STRIP_DAYS ? { kind: "trial", daysLeft: subscription.trialDaysLeft, lastDay: dayInWords(subscription.trialLastDay, locale) } : null
  }
  if (subscription.status === "PAST_DUE" && subscription.graceEndsAt !== null) {
    return { kind: "grace", payBy: dayInWords(lastDayBefore(subscription.graceEndsAt), locale) }
  }
  return null
}
