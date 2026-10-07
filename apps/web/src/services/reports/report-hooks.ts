"use client"

// Libs
import { useQuery } from "@tanstack/react-query"
import type { UseQueryResult } from "@tanstack/react-query"

// Types
import type { SalesByOriginQuery, SalesByOriginReport, StoreFunnelQuery, StoreFunnelReport } from "@harness-monorepo/contracts"

// App
import { fetchSalesByOrigin, fetchStoreFunnel } from "./report-requests"

/** Built from their inputs, never spelled at a call site (docs/ai-rules/state-and-data.md). */
export const reportKeys = {
  all: ["reports"] as const,
  shop: (slug: string) => [...reportKeys.all, slug] as const,
  salesByOrigin: (slug: string, query: Required<SalesByOriginQuery>) => [...reportKeys.shop(slug), "sales-by-origin", query.from, query.to] as const,
  funnel: (slug: string, query: Required<StoreFunnelQuery>) => [...reportKeys.shop(slug), "funnel", query.from, query.to] as const,
}

/**
 * The shop's sales in a period, by where their buyers came from (BEELINK-275). Another period is
 * another key: its numbers are never drawn under the period just left, so the table gives way to
 * its skeleton until they arrive.
 */
export function useSalesByOrigin(slug: string, query: Required<SalesByOriginQuery>): UseQueryResult<SalesByOriginReport, Error> {
  return useQuery({
    queryKey: reportKeys.salesByOrigin(slug, query),
    queryFn: () => fetchSalesByOrigin(slug, query),
    enabled: slug !== "",
  })
}

/**
 * The shop's funnel in a period (BEELINK-276). Another period is another key, as with every report:
 * the steps give way to their skeleton rather than stand under a period they are not of.
 */
export function useStoreFunnel(slug: string, query: Required<StoreFunnelQuery>): UseQueryResult<StoreFunnelReport, Error> {
  return useQuery({
    queryKey: reportKeys.funnel(slug, query),
    queryFn: () => fetchStoreFunnel(slug, query),
    enabled: slug !== "",
  })
}
