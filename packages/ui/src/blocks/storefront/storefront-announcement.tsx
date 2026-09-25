// React
import type { CSSProperties } from "react"

// UI
import { readableOn } from "@harness-monorepo/ui/lib/contrast"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontAnnouncementProps {
  /** What the shop is shouting this week, one message per entry. Empty entries are dropped. */
  messages: readonly string[]
  /** The strip's own colour — its band's. Null paints it in the page's ink, as it always was. */
  background?: string | null
  /** Already resolved by the API from the slug the target has now. Null goes nowhere. */
  href?: string | null
  external?: boolean
  linkComponent?: LinkComponent
  className?: string
}

/**
 * The marquee's speed, in CSS pixels per second, and the width a character is assumed to take at
 * this size. The second is an estimate, and it errs low on purpose: the track cannot be measured
 * before it is painted, and a few copies too many cost nothing while one too few leaves a gap at
 * the right edge.
 */
const PIXELS_PER_SECOND = 60
const PIXELS_PER_CHARACTER = 6
const GAP_PIXELS = 56
/** The strip runs the width of the window; below the tablet breakpoint this is the widest phone. */
const WIDEST_PHONE = 640

/**
 * The strip above the header, on every page of the shop.
 *
 * From the tablet breakpoint up it is what the 5a/5b designs draw: the messages side by side,
 * centred and still, in capitals. The shopkeeper once asked for "aquele que fica scrollando" and
 * got a marquee; the design settled the desktop, and the marquee stays only where the messages
 * cannot fit, which is a phone — there a strip this thin had to either cut the words or move them.
 *
 * The phone's track holds an even number of copies and moves by exactly half of itself, which is
 * what makes the loop seamless. Every copy but the first is hidden from assistive technology, so a
 * screen reader hears the messages once; from the tablet up the extra copies are not drawn at all.
 * Under `prefers-reduced-motion` nothing moves on any width.
 *
 * It runs edge to edge and not inside the shop's measure, and does not pause under the pointer:
 * a strip that stops at the header's margins reads as a header row, and one that freezes when
 * the mouse crosses it reads as broken.
 *
 * Given somewhere to go, the whole strip is one link — the same way a poster is.
 */
export function StorefrontAnnouncement({
  messages,
  background,
  href,
  external = false,
  linkComponent: Link = AnchorLink,
  className,
}: StorefrontAnnouncementProps) {
  const said = messages.map((message) => message.trim()).filter(Boolean)
  if (said.length === 0) return null

  const copyWidth = said.reduce((width, message) => width + message.length * PIXELS_PER_CHARACTER + GAP_PIXELS, 0)
  // Even, and wide enough that half the track covers the widest phone it may scroll on.
  const copies = 2 * Math.max(2, Math.ceil(WIDEST_PHONE / copyWidth))
  const duration = Math.round(((copies / 2) * copyWidth) / PIXELS_PER_SECOND)

  const painted: CSSProperties = background
    ? { backgroundColor: background, color: readableOn(background) }
    : { backgroundColor: "var(--shop-text)", color: "var(--shop-on-text)" }

  const track = (
    <div className="flex h-8 w-full items-center overflow-hidden">
      <div
        className={cn(
          "animate-marquee flex w-max shrink-0 items-center gap-14 whitespace-nowrap",
          "motion-reduce:w-full motion-reduce:animate-none motion-reduce:justify-center",
          "shop-sm:w-full shop-sm:animate-none shop-sm:justify-center",
        )}
        style={{ "--marquee-duration": `${duration}s` } as CSSProperties}
      >
        {Array.from({ length: copies }, (_, at) => (
          <p
            key={at}
            className={cn("flex items-center gap-14", at > 0 && "motion-reduce:hidden shop-sm:hidden")}
            {...(at > 0 ? { "aria-hidden": true } : {})}
          >
            {said.map((message, index) => (
              <span key={index}>{message}</span>
            ))}
          </p>
        ))}
      </div>
    </div>
  )

  const surface = cn("block w-full overflow-hidden text-xs font-bold tracking-[0.04em] uppercase", className)

  return href ? (
    <Link href={href} className={surface} style={painted} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
      {track}
    </Link>
  ) : (
    <div className={surface} style={painted}>
      {track}
    </div>
  )
}
