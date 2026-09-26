"use client"

// Libs
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { UseMutationResult } from "@tanstack/react-query"

// Types
import type { MergeStoreCustomerPayload, StoreCustomerDetail, UpdateStoreCustomerPayload } from "@harness-monorepo/contracts"

// App
import { orderKeys } from "../orders/order-hooks"
import { customerKeys } from "./customer-hooks"
import { mergeStoreCustomer, updateStoreCustomer } from "./customer-requests"

/**
 * Apart from `customer-hooks.ts` because it reaches into the orders' keys, and the orders' hooks
 * already reach into the customers': the two importing each other would be a cycle.
 *
 * The answer is the whole record, which replaces the one on screen. The customers' lists are read
 * again, and so are the shop's orders: they name the customer as the record is now.
 */
export function useUpdateStoreCustomer(
  slug: string,
  customerId: string,
): UseMutationResult<StoreCustomerDetail, Error, UpdateStoreCustomerPayload> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateStoreCustomerPayload) => updateStoreCustomer(slug, customerId, payload),
    onSuccess: (customer) => {
      queryClient.setQueryData(customerKeys.detail(slug, customerId), customer)
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: customerKeys.lists(slug) }),
        queryClient.invalidateQueries({ queryKey: orderKeys.store(slug) }),
      ])
    },
  })
}

/**
 * Two records made one. The kept record is cached under its own id, and every list of customers and
 * every order is read again: the orders moved to another customer. The other's record is dropped
 * when it is not the one on screen; when it is, the screen replaces its address with the kept one —
 * dropping it under the screen would refetch a record that no longer exists.
 */
export function useMergeStoreCustomer(
  slug: string,
  customerId: string,
): UseMutationResult<StoreCustomerDetail, Error, MergeStoreCustomerPayload> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: MergeStoreCustomerPayload) => mergeStoreCustomer(slug, customerId, payload),
    onSuccess: (kept, { otherId }) => {
      queryClient.setQueryData(customerKeys.detail(slug, kept.id), kept)
      if (otherId !== kept.id) queryClient.removeQueries({ queryKey: customerKeys.detail(slug, otherId) })
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: customerKeys.lists(slug) }),
        queryClient.invalidateQueries({ queryKey: orderKeys.store(slug) }),
      ])
    },
    // A refusal may mean the other record went meanwhile — merged from another tab: the record's
    // list of duplicates is read again rather than offering it twice.
    onError: () => queryClient.invalidateQueries({ queryKey: customerKeys.detail(slug, customerId) }),
  })
}
