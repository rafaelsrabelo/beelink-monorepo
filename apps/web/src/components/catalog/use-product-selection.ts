"use client"

// React
import { useState } from "react"

// Types
import type { ProductStatus } from "@harness-monorepo/contracts"

// App
import { useSetProductsStatus } from "@/services/catalog/catalog-hooks"

/**
 * The products chosen in the list, and what puts them in one status at once.
 *
 * The choice is by id and outlives a change of page or of filter: thirty drafts span two pages of
 * twenty, and choosing them is meant to be one action, not two. It is emptied when the change goes
 * through, or when the shopkeeper clears it — never behind their back by a navigation.
 */
export function useProductSelection(slug: string, pageIds: readonly string[]) {
  const [ids, setIds] = useState<ReadonlySet<string>>(() => new Set())
  const change = useSetProductsStatus(slug)

  function toggle(productId: string, chosen: boolean) {
    setIds((current) => {
      const next = new Set(current)
      if (chosen) next.add(productId)
      else next.delete(productId)
      return next
    })
  }

  function togglePage(chosen: boolean) {
    setIds((current) => {
      const next = new Set(current)
      for (const productId of pageIds) {
        if (chosen) next.add(productId)
        else next.delete(productId)
      }
      return next
    })
  }

  function clear() {
    setIds(new Set())
    change.reset()
  }

  function apply(status: ProductStatus) {
    change.mutate({ ids: [...ids], status }, { onSuccess: () => setIds(new Set()) })
  }

  return {
    selection: { ids, onToggle: toggle, onTogglePage: togglePage },
    count: ids.size,
    apply,
    clear,
    /** A product deleted from the list leaves the choice too, or the next change would be refused. */
    forget: (productId: string) => toggle(productId, false),
    pending: change.isPending ? (change.variables?.status ?? null) : null,
    error: change.error,
  }
}
