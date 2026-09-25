"use client"

// Libs
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query"

// Types
import type { CreateStoreCustomerPayload, StoreCustomer, StoreCustomerListQuery, StoreCustomerPage } from "@harness-monorepo/contracts"

// App
import { createStoreCustomer, fetchStoreCustomer, fetchStoreCustomers } from "./customer-requests"

/** Built from their inputs, never spelled at a call site (docs/ai-rules/state-and-data.md). */
export const customerKeys = {
  all: ["store-customers"] as const,
  store: (slug: string) => [...customerKeys.all, slug] as const,
  list: (slug: string, query: StoreCustomerListQuery) => [...customerKeys.store(slug), "list", query] as const,
  detail: (slug: string, customerId: string) => [...customerKeys.store(slug), "detail", customerId] as const,
}

export function useStoreCustomers(
  slug: string,
  query: StoreCustomerListQuery = {},
  options?: { enabled?: boolean },
): UseQueryResult<StoreCustomerPage, Error> {
  return useQuery({
    queryKey: customerKeys.list(slug, query),
    queryFn: () => fetchStoreCustomers(slug, query),
    enabled: slug !== "" && (options?.enabled ?? true),
    // The page on screen stays while the next one, or the next search, is on its way.
    placeholderData: (previous) => previous,
  })
}

export function useStoreCustomer(slug: string, customerId: string | null): UseQueryResult<StoreCustomer, Error> {
  return useQuery({
    queryKey: customerKeys.detail(slug, customerId ?? ""),
    queryFn: () => fetchStoreCustomer(slug, customerId ?? ""),
    enabled: slug !== "" && Boolean(customerId),
    // A customer who is not the shop's does not become one on a second try.
    retry: false,
  })
}

export function useCreateStoreCustomer(slug: string): UseMutationResult<StoreCustomer, Error, CreateStoreCustomerPayload> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateStoreCustomerPayload) => createStoreCustomer(slug, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerKeys.store(slug) }),
  })
}
