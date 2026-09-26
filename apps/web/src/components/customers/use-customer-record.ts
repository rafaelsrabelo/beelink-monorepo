"use client"

// React
import { useState } from "react"

// Next
import { useRouter, useSearchParams } from "next/navigation"

// Types
import type { UpdateStoreCustomerPayload } from "@harness-monorepo/contracts"
import type { OrderCustomerDraft } from "@harness-monorepo/ui/lib/order-form"

// App
import type { WebMessages } from "@/locales"
import { pageErrorCopy } from "@/components/design/page-error-copy"
import { useStoreCustomer } from "@/services/customers/customer-hooks"
import { useUpdateStoreCustomer } from "@/services/customers/customer-record-hooks"
import { CustomerRequestError } from "@/services/customers/customer-requests"
import { useOrders } from "@/services/orders/order-hooks"

/** The history's page, from the address. Anything that is not a page past the first is the first. */
export function historyPageOf(params: Pick<URLSearchParams, "get">): number {
  return Math.max(Math.trunc(Number(params.get("page") ?? 1)) || 1, 1)
}

/**
 * The form's draft as the API takes it. The phone goes only when there is one: a record that never
 * had one keeps none, and the form already refused emptying one that had. Every address part goes,
 * a blank one clearing it — the API reads blank as nothing.
 */
export function correctionOf(draft: OrderCustomerDraft): UpdateStoreCustomerPayload {
  const phone = draft.phone.trim()
  return { name: draft.name.trim(), ...(phone ? { phone } : {}), address: draft.address }
}

/**
 * A customer's record, as its screen wires it: the record, one page of their orders — the page in
 * the address, so Back from an order lands on the same one — and the correction of their details.
 * A phone another customer of the shop has is said at the phone field; any other refusal, under
 * the form. Opening or closing the form forgets the last answer.
 */
export function useCustomerRecord(slug: string, customerId: string, web: WebMessages) {
  const router = useRouter()
  const page = historyPageOf(useSearchParams())
  const record = useStoreCustomer(slug, customerId)
  // Asked with the id the API answered, and only once it did: a customer who is not the shop's has
  // no history to ask for.
  const history = useOrders(slug, { customerId: record.data?.id ?? "", page }, { enabled: Boolean(record.data) })
  const update = useUpdateStoreCustomer(slug, customerId)
  const [editing, setEditing] = useState(false)

  const phoneTaken = update.error instanceof CustomerRequestError && update.error.errorCode === "CUSTOMER_PHONE_TAKEN"
  const here = `/admin/${slug}/customers/${encodeURIComponent(customerId)}`

  return {
    record,
    history,
    page,
    // No scroll to the top: the screen brings the history into view instead, where the pager was.
    goToPage: (next: number) =>
      router.replace((next > 1 ? `${here}?page=${next}` : here) as Parameters<typeof router.replace>[0], { scroll: false }),
    profile: {
      editing,
      onEdit: () => {
        update.reset()
        setEditing(true)
      },
      onCancel: () => {
        update.reset()
        setEditing(false)
      },
      onSave: (draft: OrderCustomerDraft) => update.mutate(correctionOf(draft), { onSuccess: () => setEditing(false) }),
      pending: update.isPending,
      phoneError: phoneTaken ? pageErrorCopy(update.error, web) : undefined,
      error: phoneTaken ? undefined : pageErrorCopy(update.error, web),
      saved: update.isSuccess,
    },
  }
}
