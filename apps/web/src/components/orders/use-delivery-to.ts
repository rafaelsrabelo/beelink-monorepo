"use client"

// Types
import type { OrderCustomerOption, OrderDeliveryTo, OrderFulfillmentValue } from "@harness-monorepo/ui/lib/order-form"

// App
import { addressLineOf, isDeliverable } from "@/lib/customer-address"
import { useStoreCustomer } from "@/services/customers/customer-hooks"

/**
 * Where a delivery for the chosen customer would go: their record as it is now, which is what the
 * API is about to photograph on the order. Absent before a customer is chosen, on a pick-up, and
 * when the record cannot be read — the API still holds the rule then.
 */
export function useDeliveryTo(slug: string, customer: OrderCustomerOption | null, fulfillment: OrderFulfillmentValue): OrderDeliveryTo | undefined {
  const delivering = customer !== null && fulfillment === "DELIVERY"
  // Fresh: the shopkeeper told to fill in the address may have just done it in another tab.
  const record = useStoreCustomer(slug, delivering ? customer.id : null, { fresh: true })

  if (!delivering) return undefined
  // What was read stands through a refetch that failed; only a record never read is nothing to say.
  if (record.data) return { loading: false, line: isDeliverable(record.data.address) ? addressLineOf(record.data.address) : null }
  return record.isError ? undefined : { loading: true }
}
