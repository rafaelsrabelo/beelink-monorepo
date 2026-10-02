"use client"

// React
import { useCallback, useRef, useSyncExternalStore, type ReactNode } from "react"

// Libs
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { LANDING_CONTAINER, LANDING_SCROLL_GUTTER } from "./landing-styles"

export interface LandingRailProps {
  /** Over the row, beside the two arrows. */
  heading: ReactNode
  /** Names the scrollable row. */
  label: string
  previousLabel: string
  nextLabel: string
  /** "Página {current} de {total}", said to a reader as the row moves. */
  position: string
  /** How many banners the row holds: what the dots show until the row has been measured. */
  count: number
  /** The banners, each an `<li>`. */
  children: ReactNode
}

const ARROW = "flex size-[52px] items-center justify-center rounded-full"

/**
 * Where the row comes to rest: each banner's own start, until the row's end takes over. A wide
 * screen shows two banners and a half at once, so its row ends before the third one's start is
 * reached — three banners, and two places to stop. The dots and the arrows count these, not the
 * banners: a dot that can never light and an arrow that lands between two stops are the same mistake.
 *
 * Each banner's start is the widths before it, added up: the banners are not all one width.
 */
function stopsOf(track: HTMLElement): number[] {
  const row = track.querySelector("li")?.parentElement
  if (!row) return [0]

  const end = Math.max(0, track.scrollWidth - track.clientWidth)
  const gap = Number.parseFloat(getComputedStyle(row).columnGap) || 0
  const stops = [0]
  let start = 0
  for (const banner of [...row.children].slice(0, -1)) {
    start += (banner as HTMLElement).offsetWidth + gap
    const stop = Math.min(end, start)
    // Sub-pixel layout: two stops a hair apart are one.
    if (stop > (stops.at(-1) ?? 0) + 4) stops.push(stop)
  }
  return stops
}

/** "current/total", the stop nearest to where the row stands — a string, so the snapshot stays equal while nothing moved. */
function positionOf(track: HTMLElement | null, count: number): string {
  if (!track) return `0/${count}`

  const stops = stopsOf(track)
  const nearest = stops.reduce((best, stop, at) => (Math.abs(stop - track.scrollLeft) < Math.abs((stops[best] ?? 0) - track.scrollLeft) ? at : best), 0)
  return `${nearest}/${stops.length}`
}

/**
 * The banners' row: it scrolls sideways by itself — a finger, a trackpad and the arrow keys move it
 * before any script arrives — and the two arrows and the dots are additions on top. The reasoning,
 * and the measurements behind each choice here, are `storefront/scroll-rail.tsx`'s: native overflow
 * with snap, no `behavior` passed when scrolling (it fights the snap; the smoothness is CSS's), and
 * arrows that wrap round at either end.
 *
 * A file of its own for the same reason too: the banners stay server-rendered, and what reaches the
 * browser is a ref, two handlers and which dot is lit. It imports no dictionary for the same reason —
 * `locales/index` would carry every sentence of the design system into the page's script.
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
  const [current, total] = useSyncExternalStore(follow, () => positionOf(track.current, count), () => `0/${count}`)
    .split("/")
    .map(Number) as [number, number]

  /** To the next stop, not by a banner's width: from the row's end, a banner back lands between two stops and the snap picks the wrong one. */
  const step = (direction: 1 | -1) => {
    const el = track.current
    if (!el) return

    const stops = stopsOf(el)
    const from = Number(positionOf(el, count).split("/")[0])
    el.scrollTo({ left: stops[(from + direction + stops.length) % stops.length] ?? 0 })
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
      {/*
        Focusable and named: the arrow keys scroll what holds the focus, and a row is nothing to them
        otherwise. Its ring is drawn inside, since the row runs to the window's edges.

        The row is as wide as the window, never the page's 1440px column: past that width the first
        banner still lines up with the column — the gutter grows by half of what the window has to
        spare — and the last one runs off the window's edge rather than being cut in mid-air.
      */}
      <div
        ref={track}
        tabIndex={0}
        role="group"
        aria-label={label}
        className={cn(
          LANDING_SCROLL_GUTTER,
          "no-scrollbar snap-x snap-mandatory overflow-x-auto overscroll-x-contain focus-visible:-outline-offset-2 motion-safe:scroll-smooth min-[90rem]:scroll-px-[max(6rem,calc(50vw-39rem))]",
        )}
      >
        <ul className="flex w-max gap-[18px] px-6 md:px-10 xl:px-16 min-[90rem]:px-[max(6rem,calc(50vw-39rem))]">{children}</ul>
      </div>
      {/* The height is held while the dots change, so nothing below moves. */}
      <div aria-hidden="true" className="mt-7 flex h-2 justify-center gap-2">
        {total > 1 ? Array.from({ length: total }, (_, at) => <span key={at} className={cn("h-2 rounded-full transition-all", at === current ? "w-7 bg-brand-ink" : "w-2 bg-brand-line-strong")} />) : null}
      </div>
      <p aria-live="polite" className="sr-only">
        {position.replace("{current}", String(current + 1)).replace("{total}", String(total))}
      </p>
    </>
  )
}
