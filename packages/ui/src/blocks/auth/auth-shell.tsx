// React
import type { ReactNode } from "react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { BeelinkLogo } from "../landing/beelink-logo"
import { BrandLines } from "../landing/brand-lines"
import { LandingPicture, type LandingPhoto } from "../landing/landing-picture"
import { AnchorLink, type LinkComponent } from "./auth-link"

export interface AuthShellProps {
  /** The site's root: the mark leads back to the landing page. */
  homeHref?: string
  /** A photograph beside the form on a wide screen. None on a phone, where the form is the screen. */
  photo?: LandingPhoto | null
  children: ReactNode
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The ground every signed-out screen stands on: the landing's cream and its two yellow lines, with
 * Beelink's mark over the card — someone who came from the landing is still in the same place, and
 * has a way back to it. Given a photo, a wide screen splits in two: the photo, and the form beside it.
 *
 * The brand's tokens are a light theme's. In the dark one the ground is the panel's own, and the
 * mark takes its text colour: a cream page around a dark card is neither theme.
 */
export function AuthShell({ homeHref = "/", photo = null, children, linkComponent: Link = AnchorLink, messages = defaultMessages }: AuthShellProps) {
  return (
    <div className="flex min-h-svh bg-brand-ground dark:bg-muted">
      {photo ? (
        // Held at the screen's height while a long form scrolls beside it; `self-start`, or the row stretches it and it never sticks.
        // Lazy although it is on the first screen: hidden on a phone, an eager one would be downloaded there for nothing.
        <div className="sticky top-0 hidden h-svh w-1/2 shrink-0 self-start overflow-hidden bg-brand-ink lg:block">
          <LandingPicture photo={photo} alt="" sizes="50vw" className="size-full object-cover" />
        </div>
      ) : null}
      <div className="relative flex min-h-svh min-w-0 flex-1 flex-col items-center justify-center gap-6 overflow-x-clip p-6 md:p-10">
        <BrandLines className="-top-10 -right-[60px] hidden md:block" />
        <Link
          href={homeHref}
          aria-label={messages.landing.homeLabel}
          className="relative flex rounded-md text-brand-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current dark:text-foreground"
        >
          <BeelinkLogo className="h-11" />
        </Link>
        {/* Above the lines: a card they ran behind would still be readable, a link under them could not be clicked. */}
        <div className="relative flex w-full flex-col items-center gap-6">{children}</div>
      </div>
    </div>
  )
}
