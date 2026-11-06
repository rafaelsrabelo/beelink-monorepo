"use client"

// React
import { useEffect, useRef } from "react"

// UI
import { useLatest } from "@harness-monorepo/ui/hooks/use-latest"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { StorefrontCardSkeleton } from "./storefront-card-skeleton"
import { CATALOG_COLUMNS } from "./storefront-catalog"

export interface StorefrontLoadMoreProps {
  /** The next page's own address: what a crawler follows, and where a visitor with no script goes. */
  href: string
  /** Asks for the next page; called as the end of the shelf comes near, or on a press. */
  onLoad: () => void
  pending?: boolean
  failed?: boolean
  /** The grid's own columns, so the cards on their way take the shape of the ones to come. */
  productsPerRow?: 2 | 3 | 4
  messages?: UiMessages
}

/**
 * How far below the screen the next page starts on its way: about two rows of cards on a phone, so
 * a thumb scrolling at a reading pace never reaches the end of what is drawn.
 */
const AHEAD = "0px 0px 800px 0px"

/**
 * The foot of a shelf that loads as it is scrolled. The next page is asked for before the visitor
 * reaches it; while it comes, cards in the grid's own shape hold its place, and a page that would not
 * come says so and offers to try again, keeping everything already shown.
 *
 * It is a link to `?pagina=N+1` underneath, and only a script turns it into "more of the same page".
 * A crawler, and a visitor whose script has not arrived, follow it to the next page as a page.
 */
export function StorefrontLoadMore({ href, onLoad, pending = false, failed = false, productsPerRow = 3, messages = defaultMessages }: StorefrontLoadMoreProps) {
  const text = messages.storefront
  const sentinel = useRef<HTMLDivElement>(null)
  const load = useLatest(onLoad)

  useEffect(() => {
    const node = sentinel.current
    if (pending || failed || !node || typeof IntersectionObserver === "undefined") return

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) load.current()
    }, { rootMargin: AHEAD })
    observer.observe(node)
    return () => observer.disconnect()
  }, [pending, failed, load])

  if (pending) {
    return (
      <div role="status" aria-busy="true">
        <span className="sr-only">{text.loadingShelf}</span>
        <div aria-hidden="true" className={cn("grid gap-4", CATALOG_COLUMNS[productsPerRow])}>
          {Array.from({ length: 4 }, (_, index) => (
            <StorefrontCardSkeleton key={index} />
          ))}
        </div>
      </div>
    )
  }

  if (failed) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <p role="alert" className="text-sm text-shop-muted">{text.loadMoreFailed}</p>
        <button type="button" onClick={onLoad} className="rounded-xl bg-shop-primary px-4 py-2 text-sm font-medium text-shop-on-primary">
          {text.shelfRetry}
        </button>
      </div>
    )
  }

  return (
    <div ref={sentinel} className="flex justify-center">
      <a
        href={href}
        onClick={(event) => {
          event.preventDefault()
          onLoad()
        }}
        className="rounded-xl border border-shop-line px-4 py-2 text-sm font-medium text-shop-on-background"
      >
        {text.loadMore}
      </a>
    </div>
  )
}
