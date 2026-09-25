"use client"

// Libs
import { useQuery } from "@tanstack/react-query"
import type { UseQueryResult } from "@tanstack/react-query"

// Types
import type { StoreCustomerListQuery, StoreCustomerPage } from "@harness-monorepo/contracts"

// App
import { fetchStoreCustomers } from "./customer-requests"

/** Built from their inputs, never spelled at a call site (docs/ai-rules/state-and-data.md). */
export const customerKeys = {
  all: ["store-customers"] as const,
  store: (slug: string) => [...customerKeys.all, slug] as const,
  list: (slug: string, query: StoreCustomerListQuery) => [...customerKeys.store(slug), "list", query] as const,
}

export function useStoreCustomers(slug: string, query: StoreCustomerListQuery = {}): UseQueryResult<StoreCustomerPage, Error> {
  return useQuery({
    queryKey: customerKeys.list(slug, query),
    queryFn: () => fetchStoreCustomers(slug, query),
    enabled: slug !== "",
    // The page on screen stays while the next one, or the next search, is on its way.
    placeholderData: (previous) => previous,
  })
}
