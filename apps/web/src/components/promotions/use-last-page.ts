"use client"

// React
import { useEffect } from "react"

// Next
import { useRouter } from "next/navigation"

interface Paged {
  /** How many rows this page holds. */
  rows: number
  total: number
  page: number
  pageSize: number
}

/**
 * A page past the end — its last row was just paused out of the status, or the address was typed by
 * hand — holds nothing while the tab still counts rows: the screen would say "none" beside "(20)".
 * It steps back to the last page that has any, replacing the address rather than adding to the
 * history: the empty page was never somewhere to go back to. `list` is undefined while it is read.
 */
export function useLastPage(list: Paged | undefined, hrefOfPage: (page: number) => string): void {
  const router = useRouter()
  const target = list && list.rows === 0 && list.total > 0 && list.page > 1 ? hrefOfPage(Math.ceil(list.total / list.pageSize)) : null

  useEffect(() => {
    if (target !== null) router.replace(target as Parameters<typeof router.replace>[0])
  }, [router, target])
}
