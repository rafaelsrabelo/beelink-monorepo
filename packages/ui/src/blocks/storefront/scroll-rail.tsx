"use client"

// React
import { useCallback, useRef, useSyncExternalStore, type ReactNode } from "react"

// Libs
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"

export interface ScrollRailProps {
  /** Names the scrollable region. It is the band's own title, never "group". */
  label: string
  previousLabel: string
  nextLabel: string
  children: ReactNode
}

/**
 * A row that runs sideways, with arrows — and native scrolling underneath them.
 *
 * **Why this is not `components/carousel`.** The shadcn carousel is Embla, and Embla owns the
 * overflow: its viewport is `overflow-hidden` and every step is a transform it applies. The cards
 * are all in the HTML either way, so a crawler reads the same thing — but a person whose script
 * has not arrived sees the first few and cannot reach the rest at all. Here the browser scrolls by
 * itself: swipe, trackpad, shift-wheel and the arrow keys all work on first paint, and the two
 * buttons are an addition on top rather than the only way in. On a shop window opened from
 * WhatsApp on a cheap phone, that difference is the whole row.
 *
 * The buttons are inert until this component hydrates, which is the cost of having them at all.
 * It is a far smaller cost than the content being unreachable, and it is the reason they sit in
 * their own client file: the cards, their prices and their links stay server-rendered, and what
 * ships to the browser is a ref and two handlers.
 *
 * They are hidden where they would be noise: a finger scrolls a row by pushing it, and a row that
 * already fits has nothing to step through. That second one is the common case here — a shop with
 * four products fills less than a screen — and two arrows that do nothing on a shop's front door
 * are worse than no arrows at all.
 *
 * **The first one keys off the pointer, not the width, and that is a correction.** They used to
 * hide below the `sm` breakpoint, on the assumption that a narrow viewport meant a touch screen.
 * It does not: a desktop window dragged down to phone width still has a mouse, and with the
 * scrollbar hidden and no arrows there was no way left to move the row — `shift` and the wheel
 * works and nobody finds it. `pointer-fine` asks the real question, so a narrow window keeps its
 * arrows and a phone still does not have to look at them.
 *
 * The measurement goes through `useSyncExternalStore` rather than a `setState` in an effect. It is
 * what React 19 offers for reading layout, it keeps the lint rule about state in effects honest
 * rather than silenced, and its server snapshot is `false` — so the arrows are absent from the
 * HTML and appear only once something is there to work them. A button that exists before its
 * handler does is the thing this avoids.
 */
export function ScrollRail({ label, previousLabel, nextLabel, children }: ScrollRailProps) {
  const track = useRef<HTMLDivElement>(null)

  // Both the viewport and the track: the row overflows when the window narrows, and also when a
  // card's image finally loads and the content grows past it.
  const watch = useCallback((changed: () => void) => {
    const el = track.current
    if (!el) return () => {}

    const observer = new ResizeObserver(changed)
    observer.observe(el)
    if (el.firstElementChild) observer.observe(el.firstElementChild)

    return () => observer.disconnect()
  }, [])

  const overflows = useSyncExternalStore(
    watch,
    () => {
      const el = track.current

      return el ? el.scrollWidth > el.clientWidth : false
    },
    () => false,
  )

  /**
   * Roughly a screenful, less a card's worth of overlap, so the card that was cut by the edge is
   * the one that lands in view rather than the one after it — a step that lands exactly on the
   * fold is a step that looks like it skipped something.
   *
   * **No `behavior` here, and that is not an omission.** Passing `behavior: "smooth"` in the
   * options fights `scroll-snap-type`: measured in Chrome on this rail, a 1296px step landed back
   * at 0 with snap either `mandatory` or `proximity`, and only travelled when snap was off. The
   * smoothness comes from `scroll-behavior` in CSS instead, which the same measurement carried the
   * full 1340px with `mandatory` intact. A unit test cannot see this — it spies on `scrollBy` and
   * never lays anything out — so the arrows have to be clicked in a browser to be believed.
   */
  const step = (direction: 1 | -1) => {
    const el = track.current
    if (!el) return

    const end = el.scrollWidth - el.clientWidth
    // A few pixels of tolerance: with sub-pixel layout and snap, `scrollLeft` almost never lands
    // exactly on the end, and an equality check here is an arrow that stops working on the last
    // card for reasons nobody can see.
    const atEnd = el.scrollLeft >= end - 4
    const atStart = el.scrollLeft <= 4

    // The row wraps rather than dead-ending. An arrow that goes quiet at the last card is a
    // control that teaches you to stop using it; coming back to the first is the answer the
    // shopkeeper asked for, and it is also what says the row was finite.
    if (direction === 1 && atEnd) return el.scrollTo({ left: 0 })
    if (direction === -1 && atStart) return el.scrollTo({ left: end })

    el.scrollBy({ left: direction * Math.max(el.clientWidth - 96, 160) })
  }

  /**
   * Clicking an arrow must not focus it.
   *
   * A focused control is one the browser will scroll into view, and these sit halfway down a band
   * that is often at the fold — so the page lurches vertically at the exact moment the reader
   * asked for a horizontal move. Preventing the default on mousedown is the narrow fix: it stops
   * focus from a pointer only, so Tab still reaches both arrows and the focus ring still works for
   * anyone driving this from a keyboard.
   */
  const keepFocus = (event: { preventDefault: () => void }) => event.preventDefault()

  return (
    <div className="relative">
      {/*
        `tabindex={0}` and a named `role="group"`: a region that scrolls sideways cannot be reached
        by a keyboard unless it can hold focus, because the arrow keys scroll whatever is focused
        and a div is nothing. The links inside only hide it — the day a card carries no link the
        region is unreachable outright. That is WCAG 2.1.1, and axe does not catch it here: jsdom
        lays nothing out, so nothing measures as scrollable and the rule never fires.

        The negative margin is the fix for the last card: a rail inside a centred container ends at
        the container's padding, so the final card sits jammed against the text edge. The band
        bleeds a gutter wider than the page and pays it back as padding on the track itself — not
        on the scroller, where an end padding is the one browsers have historically dropped.
      */}
      <div
        ref={track}
        tabIndex={0}
        role="group"
        aria-label={label}
        className="no-scrollbar -mx-4 overflow-x-auto overscroll-x-contain scroll-px-4 snap-x snap-mandatory focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:scroll-smooth"
        style={{ outlineColor: "var(--shop-primary)" }}
      >
        {children}
      </div>

      {overflows ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={previousLabel}
            onMouseDown={keepFocus}
            onClick={() => step(-1)}
            className="absolute top-1/2 -left-2 hidden size-9 -translate-y-1/2 rounded-full shadow-sm pointer-fine:flex"
          >
            <ChevronLeftIcon aria-hidden="true" className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={nextLabel}
            onMouseDown={keepFocus}
            onClick={() => step(1)}
            className="absolute top-1/2 -right-2 hidden size-9 -translate-y-1/2 rounded-full shadow-sm pointer-fine:flex"
          >
            <ChevronRightIcon aria-hidden="true" className="size-4" />
          </Button>
        </>
      ) : null}
    </div>
  )
}
