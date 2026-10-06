"use client"

// Next
import { usePathname } from "next/navigation"

// App
import { useTrackView } from "./use-track"

const PAGE_VIEW = { name: "PageView" } as const

/**
 * A page view for each page of the shop: at the load, and at every move between pages, which the
 * App Router makes without one. A page is a path — a filter, a page of results or a combination
 * picked changes the address and not the page.
 *
 * It sits before the pages in the tree, so its effect runs before theirs: the page is told, then
 * what is on it.
 */
export function StorefrontPageViews() {
  useTrackView(PAGE_VIEW, usePathname())

  return null
}
