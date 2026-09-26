"use client"

// React
import { useState } from "react"

// Next
import { useRouter, useSearchParams } from "next/navigation"

// Types
import type { CustomerDuplicate } from "@harness-monorepo/contracts"

// App
import type { WebMessages } from "@/locales"
import { pageErrorCopy } from "@/components/design/page-error-copy"
import { useMergeStoreCustomer } from "@/services/customers/customer-record-hooks"

/** Set on the kept record's address once a merge lands there, for the record to say so. */
export const MERGED_KEY = "juntado"

/**
 * "Juntar com…", as the record wires it: which record the question is about, the merge, and the way
 * on — to the kept record, which is the other one when it has the account. The address is replaced,
 * not pushed: Back must not lead to a record that no longer exists.
 */
export function useCustomerMerge(slug: string, customerId: string, web: WebMessages) {
  const router = useRouter()
  const merged = useSearchParams().get(MERGED_KEY) === "1"
  const merge = useMergeStoreCustomer(slug, customerId)
  const [asking, setAsking] = useState<CustomerDuplicate | null>(null)

  return {
    merged,
    duplicates: {
      asking,
      onAsk: (duplicate: CustomerDuplicate) => {
        merge.reset()
        setAsking(duplicate)
      },
      onCancel: () => setAsking(null),
      onConfirm: () => {
        if (!asking) return
        merge.mutate(
          { otherId: asking.id },
          {
            onSuccess: (kept) => {
              setAsking(null)
              const href = `/admin/${slug}/customers/${encodeURIComponent(kept.id)}?${MERGED_KEY}=1`
              router.replace(href as Parameters<typeof router.replace>[0])
            },
          },
        )
      },
      pending: merge.isPending,
      error: merge.error ? pageErrorCopy(merge.error, web) : undefined,
    },
  }
}
