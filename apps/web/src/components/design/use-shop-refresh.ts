"use client"

// Next
import { useRouter } from "next/navigation"

// React
import { useState, useTransition } from "react"

/**
 * The shop's server read, taken again — the one place a showcase's products exist, since the API
 * resolves them from its source. Design mode asks after a showcase is saved or created, so the
 * preview draws the new source without the page reloading.
 *
 * In a transition, so the preview keeps standing while the read is out, and the one showcase
 * waiting on it can say so: `refreshingId` is that showcase until the read lands, and null after.
 */
export function useShopRefresh(): { refreshingId: string | null; refresh: (componentId: string) => void } {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [refreshing, setRefreshing] = useState<string | null>(null)

  return {
    refreshingId: pending ? refreshing : null,
    refresh: (componentId) => {
      setRefreshing(componentId)
      startTransition(() => router.refresh())
    },
  }
}
