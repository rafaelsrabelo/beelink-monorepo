"use client"

// React
import { useEffect, useState } from "react"

// Next
import { useRouter, useSearchParams } from "next/navigation"

// Types
import type { CustomerStage, StoreCustomerSort } from "@harness-monorepo/contracts"

// App
import { useDebouncedValue } from "@/services/addresses/use-debounced-value"

const STAGES = ["LEAD", "CUSTOMER", "INACTIVE"] as const satisfies readonly CustomerStage[]

const SORTS = ["RECENT", "LAST_ORDER", "MOST_ORDERS", "TOP_SPENT"] as const satisfies readonly StoreCustomerSort[]

const SEARCH_DEBOUNCE_MS = 350

/** What the customers list is narrowed to and where in it the reader is. */
export interface CustomerListAddress {
  /** Null is "Todos". */
  stage: CustomerStage | null
  sort: StoreCustomerSort
  /** Trimmed. */
  q: string
  /** 1-based. */
  page: number
}

/** The address, read. A stage or an order it cannot mean is read as none, never sent to the API to refuse. */
export function customerListAddressOf(params: Pick<URLSearchParams, "get">): CustomerListAddress {
  return {
    stage: STAGES.find((stage) => stage === params.get("stage")) ?? null,
    sort: SORTS.find((sort) => sort === params.get("sort")) ?? "RECENT",
    q: (params.get("q") ?? "").trim(),
    page: Math.max(Number(params.get("page") ?? 1) || 1, 1),
  }
}

/** The address, written. The defaults stay out: a bare `/customers` is everyone, newest first, page one. */
export function customerListHref(slug: string, next: CustomerListAddress): string {
  const search = new URLSearchParams()
  if (next.stage) search.set("stage", next.stage)
  if (next.sort !== "RECENT") search.set("sort", next.sort)
  if (next.q.trim()) search.set("q", next.q.trim())
  if (next.page > 1) search.set("page", String(next.page))

  const query = search.toString()
  return `/admin/${slug}/customers${query ? `?${query}` : ""}`
}

export interface CustomerListAddressState extends CustomerListAddress {
  /** The search box as typed, a beat ahead of the address. */
  typed: string
  setTyped: (text: string) => void
  /** Writes the address. Any change but the page itself returns to page one. */
  apply: (next: Partial<Omit<CustomerListAddress, "page">>, page?: number) => void
}

/**
 * The customers list's tab, order, search and page, kept in the address as the orders list keeps
 * its own: a record opened from here and closed with Back lands on the same tab, in the same order,
 * on the same page — and "os inativos que mais gastaram" is a link a shopkeeper can keep.
 *
 * The box is held locally too: a history entry behind every letter would be noise, and reading it
 * back from the address would make the field lag. The address wins when it changes elsewhere.
 */
export function useCustomerListAddress(slug: string): CustomerListAddressState {
  const router = useRouter()
  const address = customerListAddressOf(useSearchParams())

  const [typed, setTyped] = useState(address.q)
  const [lastSeen, setLastSeen] = useState(address.q)
  if (address.q !== lastSeen) {
    setLastSeen(address.q)
    // The address holds the text trimmed: the box keeps the space just typed before a surname.
    if (typed.trim() !== address.q) setTyped(address.q)
  }
  const settled = useDebouncedValue(typed, SEARCH_DEBOUNCE_MS)

  function apply(next: Partial<Omit<CustomerListAddress, "page">>, page = 1) {
    router.replace(customerListHref(slug, { ...address, ...next, page }) as Parameters<typeof router.replace>[0])
  }

  useEffect(() => {
    // `settled === typed`: a debounce still holding the text from before a Back must not write it
    // back over the address the Back just restored.
    if (settled === typed && settled.trim() !== address.q) apply({ q: settled })
    // What this is about is the text settling; `apply` and the rest of the address are read then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled, typed, address.q])

  return { ...address, typed, setTyped, apply }
}
