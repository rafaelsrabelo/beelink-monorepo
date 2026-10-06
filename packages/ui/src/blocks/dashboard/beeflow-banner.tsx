// React
import type { ReactNode } from "react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface BeeflowBannerProps {
  /** Where the banner leads: the shop's Integrations page, where BeeFlow is announced. */
  href: string
  /**
   * The artwork, as the app serves it — its own image component, filling the frame, with the
   * banner's `alt`. A slot and not a path, as the landing's photos are: this package serves no file.
   */
  image: ReactNode
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * BeeFlow's banner on the panel's home: the finished artwork, whole, as one link.
 *
 * The frame is the artwork's own proportion, a low strip of 2103 × 748, and nothing else sizes it, so
 * the art is never cut — on a phone it is the same picture, smaller — and its place is held before
 * the file arrives. Low on purpose: the first artwork was 16:9 and took the whole screen, with the
 * cards it sits over pushed under the fold. The link is read out as what the art says and then where
 * it leads: the art's words are the image's `alt`, and the way on is said after it.
 */
export function BeeflowBanner({ href, image, linkComponent: Link = AnchorLink, messages = defaultMessages }: BeeflowBannerProps) {
  return (
    <Link
      href={href}
      className="border-shell-border bg-muted focus-visible:ring-ring relative block aspect-[2103/748] w-full overflow-hidden rounded-xl border shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      {image}
      <span className="sr-only">{messages.integrations.upcoming.beeflow.banner.link}</span>
    </Link>
  )
}
