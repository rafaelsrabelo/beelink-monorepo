// React
import type { CSSProperties } from "react"

// UI
import { readableOn } from "@harness-monorepo/ui/lib/contrast"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { BAND } from "./storefront-band"

export interface StorefrontAnnouncementProps {
  left: string
  right?: string
  /** The strip's own colour — its band's. Null paints it in the page's ink, as it always was. */
  background?: string | null
  className?: string
}

/**
 * The strip's speed, in CSS pixels per second, and the width a character is assumed to take at
 * this size. The second is an estimate, and it errs low on purpose: the track cannot be measured
 * before it is painted, and a few copies too many cost nothing while one too few leaves a gap at
 * the right edge. Measured at about 6 in the browser; 7 was tried first and left a 155-pixel gap
 * on a 1440 page, because half the track came out narrower than the page.
 */
const PIXELS_PER_SECOND = 60
const PIXELS_PER_CHARACTER = 5
const GAP_PIXELS = 48
const WIDEST_PAGE = 1440

/**
 * The strip above the header, with its words going by.
 *
 * A marquee, because the shopkeeper asked for "aquele que fica scrollando horizontalmente" — and
 * because a strip this thin with a sentence longer than a phone is wide had to either cut it or
 * scroll it. It scrolls at a constant speed whatever the length: the duration is derived from the
 * text, so a short notice does not race and a long one does not crawl.
 *
 * The track holds an even number of copies and moves by exactly half of itself, which is what
 * makes the loop seamless. Every copy but the first is hidden from assistive technology, so a
 * screen reader hears the sentence once. Under `prefers-reduced-motion` nothing moves: the first
 * copy sits centred, the rest are not drawn.
 */
export function StorefrontAnnouncement({ left, right, background, className }: StorefrontAnnouncementProps) {
  const text = right ? `${left} · ${right}` : left
  const copyWidth = text.length * PIXELS_PER_CHARACTER + GAP_PIXELS
  // Even, and wide enough that half the track covers the widest page this window is drawn at.
  const copies = 2 * Math.max(2, Math.ceil(WIDEST_PAGE / copyWidth))
  const duration = Math.round(((copies / 2) * copyWidth) / PIXELS_PER_SECOND)

  const painted: CSSProperties = background
    ? { backgroundColor: background, color: readableOn(background) }
    : { backgroundColor: "var(--shop-text)", color: "var(--shop-on-text)" }

  return (
    <div
      className={cn("w-full overflow-hidden text-[11px] font-medium tracking-wide uppercase", className)}
      style={painted}
    >
      <div className={cn(BAND, "flex h-8 items-center overflow-hidden")}>
        <div
          className={cn(
            "animate-marquee flex w-max shrink-0 items-center gap-12 whitespace-nowrap",
            "hover:[animation-play-state:paused]",
            "motion-reduce:w-full motion-reduce:animate-none motion-reduce:justify-center",
          )}
          style={{ "--marquee-duration": `${duration}s` } as CSSProperties}
        >
          {Array.from({ length: copies }, (_, at) => (
            <p key={at} {...(at > 0 ? { "aria-hidden": true, className: "motion-reduce:hidden" } : {})}>
              {text}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}
