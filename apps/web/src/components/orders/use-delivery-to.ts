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
  const record = useStoreCustomer(slug, delivering ? customer.id : null)

  if (!delivering || record.isError) return undefined
  if (!record.data) return { loading: true }
  return { loading: false, line: isDeliverable(record.data.address) ? addressLineOf(record.data.address) : null }
}
