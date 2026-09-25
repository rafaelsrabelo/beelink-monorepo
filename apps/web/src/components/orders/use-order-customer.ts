"use client"

// React
import { useState } from "react"

// Libs
import { useQueryClient } from "@tanstack/react-query"

// Types
import type { CreateStoreCustomerPayload, StoreCustomer } from "@harness-monorepo/contracts"
import type { OrderCustomerDraft, OrderCustomerOption } from "@harness-monorepo/ui/lib/order-form"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { WebMessages } from "@/locales"
import { pageErrorCopy } from "@/components/design/page-error-copy"
import { useDebouncedValue } from "@/services/addresses/use-debounced-value"
import { customerKeys, useCreateStoreCustomer, useStoreCustomer, useStoreCustomers } from "@/services/customers/customer-hooks"
import { CustomerRequestError, fetchStoreCustomers } from "@/services/customers/customer-requests"

const SEARCH_DEBOUNCE_MS = 300
const SEARCH_PAGE_SIZE = 6

function optionOf(customer: StoreCustomer): OrderCustomerOption {
  return { id: customer.id, name: customer.name, phone: customer.phone, email: customer.email }
}

/** The draft as the API takes it: the address only with what was typed in it. */
function payloadOf(draft: OrderCustomerDraft): CreateStoreCustomerPayload {
  const address = Object.fromEntries(Object.entries(draft.address).filter(([, value]) => value.trim() !== ""))
  return { name: draft.name.trim(), phone: draft.phone, ...(Object.keys(address).length ? { address } : {}) }
}

/**
 * Who the new order is for: the customer the page was opened with, one found by the search, or one
 * registered on the spot. A phone the shop already has is not a second customer — the one who has
 * it is looked up and offered instead.
 */
export function useOrderCustomer(slug: string, initialCustomerId: string | null, messages: UiMessages, web: WebMessages) {
  const queryClient = useQueryClient()
  // `undefined` is "not touched yet": the customer the page was opened with, once it arrives.
  const [picked, setPicked] = useState<OrderCustomerOption | null | undefined>(undefined)
  const [query, setQuery] = useState("")
  const [existing, setExisting] = useState<OrderCustomerOption | null>(null)

  const initial = useStoreCustomer(slug, picked === undefined ? initialCustomerId : null)
  const settled = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS)
  const results = useStoreCustomers(slug, { q: settled, pageSize: SEARCH_PAGE_SIZE }, { enabled: settled !== "" })
  const create = useCreateStoreCustomer(slug)

  const selected = picked === undefined ? (initial.data ? optionOf(initial.data) : null) : picked

  async function register(draft: OrderCustomerDraft) {
    setExisting(null)
    try {
      setPicked(optionOf(await create.mutateAsync(payloadOf(draft))))
    } catch (error) {
      if (!(error instanceof CustomerRequestError) || error.errorCode !== "CUSTOMER_PHONE_TAKEN") return
      const digits = draft.phone.replace(/\D/g, "")
      const found = await queryClient
        .fetchQuery({ queryKey: customerKeys.list(slug, { q: digits, pageSize: 1 }), queryFn: () => fetchStoreCustomers(slug, { q: digits, pageSize: 1 }) })
        .catch(() => null)
      setExisting(found?.customers[0] ? optionOf(found.customers[0]) : null)
    }
  }

  const createError =
    create.error instanceof CustomerRequestError && create.error.errorCode === "CUSTOMER_PHONE_TAKEN"
      ? messages.orders.form.customerExists
      : pageErrorCopy(create.error, web)

  return {
    selected,
    loading: picked === undefined && initial.isPending && Boolean(initialCustomerId),
    /** The page was opened for a customer this shop does not have. */
    initialError: picked === undefined ? pageErrorCopy(initial.error, web) : undefined,
    select: (customer: OrderCustomerOption) => {
      create.reset()
      setExisting(null)
      setPicked(customer)
    },
    clear: () => setPicked(null),
    search: {
      query,
      onQueryChange: setQuery,
      results: settled === "" ? [] : (results.data?.customers ?? []).map(optionOf),
      searching: settled !== query.trim() || results.isFetching,
    },
    create: {
      onSubmit: (draft: OrderCustomerDraft) => void register(draft),
      pending: create.isPending,
      error: createError,
      existing,
      onCancel: () => {
        create.reset()
        setExisting(null)
      },
    },
  }
}
