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
 * This is what tells a page nothing else happens on. Where something does — a product seen, a
 * search — the dispatch itself puts the page's view first, and this one is not sent twice.
 */
export function StorefrontPageViews() {
  useTrackView(PAGE_VIEW, usePathname())

  return null
}
