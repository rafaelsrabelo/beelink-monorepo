"use client"

// React
import { useCallback, useEffect, useSyncExternalStore } from "react"

// Libs
import { useQuery, useQueryClient, type Query, type QueryCache, type UseQueryResult } from "@tanstack/react-query"

// Types
import type { StoreSubscriptionAnswer } from "@harness-monorepo/contracts"

// App
import { isPageLockedError } from "@/lib/page-lock"
import { billingKeys } from "./billing-keys"
import { fetchStoreSubscription } from "./billing-requests"

/** While a locked page's notice is up, how often its subscription is read again: a payment that came another way opens it. */
export const LOCKED_REREAD_MS = 60_000

/** Whether the answer says the page is locked: only ever where billing is on and the page can pay. */
const lockedIn = (answer: StoreSubscriptionAnswer | undefined) => answer?.billingEnforced === true && (answer.subscription?.lock ?? null) !== null

/** Whose subscription a query is, or null for any other query. */
function subscriptionSlugOf(query: Query): string | null {
  const prefix = billingKeys.subscriptions()
  const key = query.queryKey
  const slug = key[prefix.length]
  return key.length === prefix.length + 1 && prefix.every((part, at) => key[at] === part) && typeof slug === "string" ? slug : null
}

/** The last instant a read was refused for its page's lock — of the reads in use, or of every read kept — 0 for none. */
function lastLockRefusalIn(cache: QueryCache, inUse: boolean): number {
  let latest = 0
  for (const query of cache.findAll(inUse ? { type: "active" } : {})) {
    if (isPageLockedError(query.state.error)) latest = Math.max(latest, query.state.errorUpdatedAt)
  }
  return latest
}

/**
 * When a read was last refused with `PAGE_LOCKED` (BEELINK-223), 0 for never: of the reads in use — the
 * shell's and the screen's, all of the page in the address — or of every read kept, a screen put away
 * included.
 */
function useLockRefusedAt(inUse: boolean): number {
  const cache = useQueryClient().getQueryCache()
  const subscribe = useCallback((onChange: () => void) => cache.subscribe(onChange), [cache])
  return useSyncExternalStore(
    subscribe,
    () => lastLockRefusalIn(cache, inUse),
    () => 0,
  )
}

/**
 * Once a page's subscription reads open after it read locked — paid, or given a free month — every read
 * refused for the lock starts over (`resetQueries`), the reads in use asked again: drawn from their
 * skeleton, never from the old refusal. Done where the answer is written, in the cache's own listener,
 * so it is done before any screen of the page is drawn again; a page never read locked starts nothing
 * over, so a read and a guard that disagreed for an instant cannot loop.
 */
function useStartOverOnceOpen(): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    const cache = queryClient.getQueryCache()
    const locked = new Set<string>()
    for (const query of cache.findAll({ queryKey: billingKeys.subscriptions() })) {
      const slug = subscriptionSlugOf(query)
      if (slug !== null && lockedIn(query.state.data as StoreSubscriptionAnswer | undefined)) locked.add(slug)
    }

    return cache.subscribe((event) => {
      if (event.type !== "updated" || event.action.type !== "success") return
      const slug = subscriptionSlugOf(event.query)
      if (slug === null) return
      if (lockedIn(event.action.data as StoreSubscriptionAnswer)) {
        locked.add(slug)
        return
      }
      if (locked.delete(slug)) void queryClient.resetQueries({ predicate: (query) => isPageLockedError(query.state.error) })
    })
  }, [queryClient])
}

export interface PageStanding {
  /** The page's subscription as the API last read it — the entry the Assinar screen and the plan's card read too. */
  subscription: UseQueryResult<StoreSubscriptionAnswer, Error>
  /** A read was refused for a page's lock while this page's subscription had not answered yet. */
  refused: boolean
}

/**
 * Where the open page stands for the panel's gate (BEELINK-296): its subscription, and whether the API
 * refused a read for a lock before the subscription said anything.
 *
 * The subscription is read once for each page the shell opens, then again only where billing is on: on
 * coming back to the tab, and each minute while the page reads locked — a payment that reached the API
 * another way (the webhook, the routine) opens it. Never on the Assinar screen, whose check asks Asaas
 * and writes this same entry: a read begun before it could land after it (BEELINK-293).
 *
 * A refusal before the subscription first answered closes the page's screens until it does — every read
 * kept counts, since the screen put away takes its read out of use. Once it has answered, a refusal
 * newer than the last read has the subscription asked again, once a refusal, and closes nothing: the
 * answer says. A screen taken away and put back would ask again on mounting, and could loop.
 */
export function usePageStanding(slug: string | null, onSubscribe: boolean): PageStanding {
  const subscription = useQuery({
    queryKey: billingKeys.subscription(slug ?? ""),
    queryFn: () => fetchStoreSubscription(slug ?? ""),
    enabled: slug !== null,
    refetchOnWindowFocus: (query) => !onSubscribe && query.state.data?.billingEnforced === true,
    refetchInterval: (query) => (!onSubscribe && lockedIn(query.state.data) ? LOCKED_REREAD_MS : false),
  })
  const refusedInUseAt = useLockRefusedAt(true)
  const refusedKeptAt = useLockRefusedAt(false)
  useStartOverOnceOpen()

  const locked = lockedIn(subscription.data)
  const askedAt = Math.max(subscription.dataUpdatedAt, subscription.errorUpdatedAt)
  const { isFetching, refetch } = subscription
  useEffect(() => {
    if (slug === null || locked || refusedInUseAt <= askedAt || isFetching) return
    void refetch()
  }, [slug, locked, refusedInUseAt, askedAt, isFetching, refetch])

  return { subscription, refused: slug !== null && subscription.data === undefined && refusedKeptAt > 0 }
}
