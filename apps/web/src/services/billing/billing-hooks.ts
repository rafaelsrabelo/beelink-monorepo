"use client"

// React
import { useEffect, useRef } from "react"

// Libs
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query"

// Types
import type { BillingAccount, BillingAccountAnswer, BillingAccountPayload, CouponRedemptionPayload, PlanCatalog, StoreSubscriptionAnswer, SubscriptionChoice, SubscriptionChoicePayload } from "@harness-monorepo/contracts"

// App
import { CHECK_STOPPING_CODES, MOVED_CODES, subscriptionCheckDelayOf } from "@/lib/subscribe-view"
import { billingKeys } from "./billing-keys"
import { BillingRequestError, checkStoreSubscription, chooseSubscriptionCycle, fetchBillingAccount, fetchPlanCatalog, fetchStoreSubscription, redeemCoupon, saveBillingAccount } from "./billing-requests"

/** The plans change by a deploy, never under a screen: read once in a while. */
const PLANS_STALE_MS = 5 * 60_000

/** The first look after a choice is the clock's, or the tab coming back's: the choice's own answer stands for this long. */
const CHOICE_STANDS_MS = 10_000

const codeOf = (error: unknown): string => (error instanceof BillingRequestError ? error.errorCode : "UNKNOWN")

/** A refusal that asking again cannot change: this deployment cannot charge, or the session is over. */
const settled = (error: unknown) => ["BILLING_UNAVAILABLE", "AUTH_UNAUTHENTICATED"].includes(codeOf(error))

export function usePlanCatalog(enabled = true): UseQueryResult<PlanCatalog, Error> {
  return useQuery({ queryKey: billingKeys.plans(), queryFn: fetchPlanCatalog, enabled, staleTime: PLANS_STALE_MS })
}

/** Who the account's pages are charged to. Without bee-link's Asaas key the API refuses it outright, and that is not asked again. */
export function useBillingAccount(enabled = true): UseQueryResult<BillingAccountAnswer, Error> {
  return useQuery({ queryKey: billingKeys.account(), queryFn: fetchBillingAccount, enabled, retry: (failures, error) => !settled(error) && failures < 3 })
}

/** Keeps who is charged; the answer is what the account then reads, so the screen needs no second read. */
export function useSaveBillingAccount(): UseMutationResult<BillingAccount, Error, BillingAccountPayload> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: saveBillingAccount,
    onSuccess: (account) => queryClient.setQueryData<BillingAccountAnswer>(billingKeys.account(), { account }),
  })
}

/**
 * Where the page stands, as the bee-link API last knew it: read on every arrival at the screen.
 *
 * Not on coming back to the tab — that is the check's (`useSubscriptionCheck`), which asks Asaas
 * first. Both at once, a read begun before the check wrote could land after it and put the page back
 * as unpaid.
 */
export function useStoreSubscription(slug: string): UseQueryResult<StoreSubscriptionAnswer, Error> {
  return useQuery({ queryKey: billingKeys.subscription(slug), queryFn: () => fetchStoreSubscription(slug), staleTime: 0, refetchOnWindowFocus: false })
}

/**
 * The cycle chosen (BEELINK-292). The answer is the page as it now reads, written where the screen
 * reads it — with billing on, since a choice is only ever taken where it is — and kept as the first
 * check, so the screen's wait asks Asaas only when its clock or the tab says so.
 *
 * A refusal that means the page moved (`MOVED_CODES`) has its subscription read again; one that means
 * the account never said who is charged has the account read again.
 */
export function useChooseCycle(slug: string): UseMutationResult<SubscriptionChoice, Error, SubscriptionChoicePayload> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: SubscriptionChoicePayload) => chooseSubscriptionCycle(slug, payload),
    onSuccess: (choice) => {
      const answer: StoreSubscriptionAnswer = { billingEnforced: true, subscription: choice.subscription }
      queryClient.setQueryData(billingKeys.subscription(slug), answer)
      queryClient.setQueryData(billingKeys.check(slug), answer)
    },
    onError: (error) => {
      const code = codeOf(error)
      if (MOVED_CODES.has(code)) return queryClient.invalidateQueries({ queryKey: billingKeys.subscription(slug) })
      if (code === "BILLING_ACCOUNT_REQUIRED") return queryClient.invalidateQueries({ queryKey: billingKeys.account() })
    },
  })
}

/**
 * A coupon of bee-link's used on the page (BEELINK-224). The answer is the page as it now reads,
 * written where the screen reads it, as a choice's is. The page may have been locked a moment ago, and
 * its panel then answered nothing: what the panel read is read again — the billing's own reads aside,
 * which the answer is — so it is whole by the time the screen leads to it. A refusal that means the
 * page moved has the subscription read again.
 */
export function useRedeemCoupon(slug: string): UseMutationResult<StoreSubscriptionAnswer, Error, CouponRedemptionPayload> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CouponRedemptionPayload) => redeemCoupon(slug, payload),
    onSuccess: (answer) => {
      queryClient.setQueryData(billingKeys.subscription(slug), answer)
      queryClient.setQueryData(billingKeys.check(slug), answer)
      // Not awaited: the coupon is said taken at once, and the panel's reads follow on their own.
      void queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== billingKeys.all[0] })
    },
    onError: (error) => {
      if (MOVED_CODES.has(codeOf(error))) return queryClient.invalidateQueries({ queryKey: billingKeys.subscription(slug) })
    },
  })
}

/**
 * - `off`: nothing to learn from Asaas.
 * - `once`: an invoice is out — the page is asked about once on arriving, and again on coming back to the tab.
 * - `watch`: an invoice was opened from this screen — asked on coming back to the tab, and by a clock
 *   that slows as the wait grows and stops after `SUBSCRIPTION_WATCH_FOR_MS`.
 */
export type SubscriptionCheckMode = "off" | "once" | "watch"

/**
 * Whether the page's charge was paid, asked now (BEELINK-221): the API reads Asaas — at most once in
 * ten seconds for a page — and the answer is written where the screen reads the subscription. A
 * hidden tab is never asked by the clock (`refetchIntervalInBackground`), and coming back to it asks
 * at once whatever the clock says: that is where a shopkeeper returns from Asaas's page or the bank's
 * app. An ended session and the API's limit stop the clock; anything else waits for the next tick.
 */
export function useSubscriptionCheck(slug: string, mode: SubscriptionCheckMode): UseQueryResult<StoreSubscriptionAnswer, Error> {
  const queryClient = useQueryClient()
  const waitingSince = useRef<number | null>(null)

  useEffect(() => {
    waitingSince.current = mode === "watch" ? Date.now() : null
  }, [mode])

  return useQuery({
    queryKey: billingKeys.check(slug),
    queryFn: async () => {
      const answer = await checkStoreSubscription(slug)
      queryClient.setQueryData(billingKeys.subscription(slug), answer)
      return answer
    },
    enabled: mode !== "off",
    staleTime: CHOICE_STANDS_MS,
    refetchOnWindowFocus: mode === "off" ? false : "always",
    refetchInterval: (query) => {
      if (mode !== "watch" || CHECK_STOPPING_CODES.has(codeOf(query.state.error))) return false
      return subscriptionCheckDelayOf(Date.now() - (waitingSince.current ?? Date.now()))
    },
    refetchIntervalInBackground: false,
    retry: false,
  })
}
