"use client"

// Libs
import { keepPreviousData, useQuery } from "@tanstack/react-query"

// Types
import type { SubscriptionCardView } from "@harness-monorepo/ui/lib/subscription"

// App
import { planCardOf } from "@/lib/plan-card-view"
import { offersOf, subscribePageOf } from "@/lib/subscribe-view"
import { useBillingAccount, usePlanCatalog } from "./billing-hooks"
import { billingKeys } from "./billing-keys"
import { fetchStoreSubscription } from "./billing-requests"

/** The plan's card as the panel's rail draws it: what it says, or null for its skeleton, and where it leads. */
export interface PlanCard {
  view: SubscriptionCardView | null
  href: string
}

/**
 * The open page's plan, for the card in the panel's menu (BEELINK-220) — or null where the menu has none:
 * no page open, billing off, a page owing nothing or with no subscription, and before the page's first
 * answer, which alone says whether billing is on. Until then nothing is drawn, so the rail of a panel that
 * charges nothing never changes, not even for a skeleton.
 *
 * The subscription is the entry the panel's gate reads (`usePageStanding`) and the Assinar screen writes:
 * observed here and never asked (`enabled: false`), so the card costs no request of its own and moves with
 * the Assinar screen, the coupon, the check and the unlocking. Billing is a deployment's, not a page's:
 * while another page's answer is read, the last one stands in (`keepPreviousData`) to say whether a
 * skeleton belongs in the card's place — never what the card says.
 *
 * The plan's name is the page's choice, or the catalogue's plan on sale for a page that chose none; and a
 * warning of the strip's kind waits on the account's billing read, as the strip does: without bee-link's
 * Asaas key it is refused, nothing locks, and the card stays quiet. Both reads are the Assinar screen's
 * and the strip's own entries, asked only with billing on, and only where the card needs them.
 */
export function usePlanCard(slug: string | null, locale: string): PlanCard | null {
  const subscription = useQuery({
    queryKey: billingKeys.subscription(slug ?? ""),
    queryFn: () => fetchStoreSubscription(slug ?? ""),
    enabled: false,
    placeholderData: keepPreviousData,
  })
  const answer = subscription.isPlaceholderData ? undefined : subscription.data
  const reading = slug !== null && answer !== undefined ? planCardOf(answer, new Date(), locale) : null
  const catalog = usePlanCatalog(reading !== null && reading.plan === null)
  const account = useBillingAccount(reading?.warning === "strip")

  if (slug === null) return null
  const href = subscribePageOf(slug)
  if (answer === undefined) return subscription.isPlaceholderData && subscription.data?.billingEnforced === true ? { view: null, href } : null
  if (reading === null) return null

  const named = reading.plan ?? (catalog.data ? (offersOf(catalog.data, null, new Date(), locale)?.plan.name ?? null) : null)
  if (named === null && catalog.isPending) return { view: null, href }
  const urgent = reading.warning === "lock" || (reading.warning === "strip" && account.data !== undefined)

  return { view: { plan: named, standing: reading.standing, urgent }, href }
}
