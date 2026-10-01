"use client"

// React
import { useCallback, useRef, useSyncExternalStore, type ReactNode } from "react"

// Libs
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { format } from "@harness-monorepo/ui/locales/index"

// Block
import { LANDING_CONTAINER, LANDING_SCROLL_GUTTER } from "./landing-styles"

export interface LandingRailProps {
  /** Over the row, beside the two arrows. */
  heading: ReactNode
  /** Names the scrollable row. */
  label: string
  previousLabel: string
  nextLabel: string
  /** "Destaque {current} de {total}", said to a reader as the row moves. */
  position: string
  /** How many banners the row holds: one dot each. */
  count: number
  /** The banners, each an `<li>`. */
  children: ReactNode
}

const ARROW = "flex size-[52px] items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink"

/** The banner in view, from zero. The last one counts as in view once the row reached its end, which a wide screen does before its edge lines up. */
function indexOf(track: HTMLElement | null, count: number): number {
  const first = track?.querySelector("li")
  if (!track || !first) return 0
  if (track.scrollLeft >= track.scrollWidth - track.clientWidth - 4) return track.scrollLeft > 4 ? count - 1 : 0

  const gap = Number.parseFloat(getComputedStyle(first.parentElement ?? first).columnGap) || 0
  return Math.min(count - 1, Math.round(track.scrollLeft / (first.offsetWidth + gap)))
}

/**
 * The banners' row: it scrolls sideways by itself — a finger, a trackpad and the arrow keys move it
 * before any script arrives — and the two arrows and the dots are additions on top. The reasoning,
 * and the measurements behind each choice here, are `storefront/scroll-rail.tsx`'s: native overflow
 * with snap, no `behavior` passed to `scrollBy` (it fights the snap; the smoothness is CSS's), and
 * arrows that wrap round at either end.
 *
 * A file of its own for the same reason too: the banners stay server-rendered, and what reaches the
 * browser is a ref, two handlers and which dot is lit.
 */
export function LandingRail({ heading, label, previousLabel, nextLabel, position, count, children }: LandingRailProps) {
  const track = useRef<HTMLDivElement>(null)

  const follow = useCallback((changed: () => void) => {
    const el = track.current
    if (!el) return () => {}

    const observer = new ResizeObserver(changed)
    observer.observe(el)
    el.addEventListener("scroll", changed, { passive: true })
    return () => {
      observer.disconnect()
      el.removeEventListener("scroll", changed)
    }
  }, [])
  const current = useSyncExternalStore(follow, () => indexOf(track.current, count), () => 0)

  const step = (direction: 1 | -1) => {
    const el = track.current
    const first = el?.querySelector("li")
    if (!el || !first) return

    const end = el.scrollWidth - el.clientWidth
    if (direction === 1 && el.scrollLeft >= end - 4) return el.scrollTo({ left: 0 })
    if (direction === -1 && el.scrollLeft <= 4) return el.scrollTo({ left: end })

    const gap = Number.parseFloat(getComputedStyle(first.parentElement ?? first).columnGap) || 0
    el.scrollBy({ left: direction * (first.offsetWidth + gap) })
  }

  /** A focused arrow is scrolled into view, and the page would lurch as the row moves: a pointer does not focus it, Tab still does. */
  const keepFocus = (event: { preventDefault: () => void }) => event.preventDefault()

  return (
    <>
      <div className={cn(LANDING_CONTAINER, "mb-8 flex flex-wrap items-end gap-x-6 gap-y-4")}>
        <div className="min-w-0 flex-1 basis-72">{heading}</div>
        {/* A finger pushes the row: the arrows are for a pointer that cannot. */}
        <div className="ml-auto hidden shrink-0 gap-2.5 pointer-fine:flex">
          <button type="button" aria-label={previousLabel} onMouseDown={keepFocus} onClick={() => step(-1)} className={cn(ARROW, "border-[1.5px] border-brand-line-strong bg-brand-surface hover:border-brand-ink")}>
            <ChevronLeftIcon aria-hidden="true" className="size-5" />
          </button>
          <button type="button" aria-label={nextLabel} onMouseDown={keepFocus} onClick={() => step(1)} className={cn(ARROW, "bg-brand-ink text-brand-on-ink")}>
            <ChevronRightIcon aria-hidden="true" className="size-5" />
          </button>
        </div>
      </div>
      {/* Focusable and named: the arrow keys scroll what holds the focus, and a row is nothing to them otherwise. */}
      <div
        ref={track}
        tabIndex={0}
        role="group"
        aria-label={label}
        className={cn(LANDING_SCROLL_GUTTER, "no-scrollbar mx-auto max-w-[1440px] snap-x snap-mandatory overflow-x-auto overscroll-x-contain focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-ink motion-safe:scroll-smooth")}
      >
        <ul className="flex w-max gap-[18px] px-6 md:px-10 xl:px-16 min-[90rem]:px-24">{children}</ul>
      </div>
      <div aria-hidden="true" className="mt-7 flex justify-center gap-2">
        {Array.from({ length: count }, (_, at) => (
          <span key={at} className={cn("h-2 rounded-full transition-all", at === current ? "w-7 bg-brand-ink" : "w-2 bg-brand-line-strong")} />
        ))}
      </div>
      <p aria-live="polite" className="sr-only">
        {format(position, { current: String(current + 1), total: String(count) })}
      </p>
    </>
  )
}
