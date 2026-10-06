// React
import type { ReactNode } from "react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

/** Each half of the frame, drawn from the edge of the art on its own side. */
const SIDES = [
  { half: "left-0", from: "origin-left" },
  { half: "right-0", from: "origin-right" },
] as const

export interface BeeflowBannerProps {
  /** Where the banner leads: the shop's Integrations page, where BeeFlow is announced. */
  href: string
  /**
   * The artwork, as the app serves it — its own image component, filling the frame, with the
   * banner's `alt`. A slot and not a path, as the landing's photos are: this package serves no file.
   */
  image: ReactNode
  /**
   * The same artwork again, stretched edge to edge of its box and said to nobody: its outermost
   * sliver, drawn out, is what shows at the sides once the frame stops growing taller. Without it the
   * sides are the muted fill.
   */
  backdrop?: ReactNode
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * BeeFlow's banner on the panel's home: the finished artwork, whole, as one link.
 *
 * The frame is the artwork's own proportion, a low strip of 2103 × 748, until it is 320px tall — and
 * there it stops, however wide the page's column gets. The column has no measure of its own, so a
 * frame that only kept the proportion was 580px tall on a 1920px monitor and 800px on a wider one,
 * with the cards it sits over pushed under the fold. The art is never cut to fit: it is drawn whole
 * and centred, and `image` must not fill past its own proportion — the sides are the `backdrop`, the
 * art's own first and last fortieth drawn out to the frame's edges. The art ends in plain background
 * there, so it reads as one picture with no seam; out of focus behind itself, it was a smear of the
 * logo beside a hard edge. On a phone it is the same
 * picture, smaller. The link is read out as what the art says and then where it leads: the art's
 * words are the image's `alt`, and the way on is said after it.
 */
export function BeeflowBanner({ href, image, backdrop, linkComponent: Link = AnchorLink, messages = defaultMessages }: BeeflowBannerProps) {
  return (
    <Link
      href={href}
      className="border-shell-border bg-muted focus-visible:ring-ring relative block aspect-[2103/748] max-h-80 w-full overflow-hidden rounded-xl border shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      {backdrop
        ? SIDES.map((side) => (
            <span key={side.half} aria-hidden="true" className={cn("absolute inset-y-0 w-1/2 overflow-hidden", side.half)}>
              <span className={cn("absolute inset-0 scale-x-[40]", side.from)}>{backdrop}</span>
            </span>
          ))
        : null}
      {image}
      <span className="sr-only">{messages.integrations.upcoming.beeflow.banner.link}</span>
    </Link>
  )
}
