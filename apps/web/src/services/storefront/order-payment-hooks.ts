"use client"

// Libs
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query"

// Types
import type { CustomerOrderPaymentAnswer } from "@harness-monorepo/contracts"

// App
import { makeOrderPayment, readOrderPayment, ShopperOrderError } from "./storefront-requests"

export const orderPaymentKeys = {
  /** Every charge the shopper's screens hold of this shop: what news of an order reads again. */
  shop: (slug: string) => ["storefront", slug, "payment"] as const,
  order: (slug: string, number: number) => [...orderPaymentKeys.shop(slug), number] as const,
}

/**
 * The charge of one order, kept fresh while somebody is looking (BEELINK-205). `pollMs` says, from
 * the last answer, how long until it is asked again — or false, when nothing will change by itself.
 *
 * It asks the bee-link API and never Asaas: an order is paid when the API says so. The interval
 * stops with the tab hidden (`refetchIntervalInBackground`), and coming back to the tab asks at
 * once, whatever the interval — that is where a shopper returns from their bank's app. The
 * real-time channel drops this key on news of the order (`shopperReadOf`); the interval is what
 * tells an approval until that channel carries one (BEELINK-206), and the net under it afterwards.
 *
 * Stale at once, so every mount and every return to the tab asks. What the cache kept from an
 * earlier visit is still handed over while that first read is out — a charge that may have been
 * paid since — so a screen draws from `isFetchedAfterMount`, never from the kept answer alone.
 */
export function useOrderPayment(slug: string, number: number, pollMs: (answer: CustomerOrderPaymentAnswer) => number | false): UseQueryResult<CustomerOrderPaymentAnswer, Error> {
  return useQuery({
    queryKey: orderPaymentKeys.order(slug, number),
    queryFn: () => readOrderPayment(slug, number),
    staleTime: 0,
    // A read that failed is asked again by the shopper, or by the tab coming back — not in a loop.
    refetchInterval: (query) => (query.state.data && query.state.status === "success" ? pollMs(query.state.data) : false),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: "always",
    // An ended session does not come back by asking again; anything else gets one more try.
    retry: (failures, error) => failures < 1 && !(error instanceof ShopperOrderError && error.errorCode === "AUTH_UNAUTHENTICATED"),
  })
}

/** "Gerar pagamento" and "Gerar novo Pix". The charge it answers is the screen's at once: it is what `GET` would read. */
export function useMakeOrderPayment(slug: string, number: number): UseMutationResult<CustomerOrderPaymentAnswer, Error, void> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => makeOrderPayment(slug, number),
    onSuccess: (answer) => queryClient.setQueryData(orderPaymentKeys.order(slug, number), answer),
  })
}
