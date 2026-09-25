"use client"

// Libs
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { UseMutationResult } from "@tanstack/react-query"

// Types
import type { StoreCustomerDetail, UpdateStoreCustomerPayload } from "@harness-monorepo/contracts"

// App
import { orderKeys } from "../orders/order-hooks"
import { customerKeys } from "./customer-hooks"
import { updateStoreCustomer } from "./customer-requests"

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
