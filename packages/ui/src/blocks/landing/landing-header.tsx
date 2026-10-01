// Libs
import { ArrowRightIcon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { BeelinkMark } from "./beelink-mark"
import { LANDING_CONTAINER, LANDING_CTA } from "./landing-styles"

export interface LandingHeaderProps {
  /** The site's root: the mark leads back to it. */
  homeHref?: string
  loginHref: string
  signupHref: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** The page's own sections, by the anchors the blocks below carry. */
export const LANDING_ANCHORS = { solutions: "#solucoes", ecosystem: "#ecossistema", how: "#como", couriers: "#entregadores", faq: "#perguntas" } as const

/**
 * The landing's top: the mark, the way to each section, and the two ways in — signing in, and
 * creating a shop. Below the width the five links fit in, they give way to those two: the page is
 * one column to scroll, and the hero's own button is a thumb away.
 */
export function LandingHeader({ homeHref = "/", loginHref, signupHref, linkComponent: Link = AnchorLink, messages = defaultMessages }: LandingHeaderProps) {
  const text = messages.landing
  const sections = [
    [LANDING_ANCHORS.solutions, text.nav.solutions],
    [LANDING_ANCHORS.ecosystem, text.nav.ecosystem],
    [LANDING_ANCHORS.how, text.nav.how],
    [LANDING_ANCHORS.couriers, text.nav.couriers],
    [LANDING_ANCHORS.faq, text.nav.faq],
  ] as const

  return (
    <header className={cn(LANDING_CONTAINER, "relative flex h-[76px] items-center gap-6 md:h-[92px] xl:gap-11")}>
      <Link href={homeHref} aria-label={text.homeLabel} className="flex items-center gap-3">
        <BeelinkMark className="size-8 md:size-10" />
        <span className="text-2xl font-extrabold tracking-[-0.02em] md:text-[28px]">{text.brand}</span>
      </Link>
      <nav aria-label={text.nav.label} className="hidden gap-[30px] text-[15px] font-medium whitespace-nowrap xl:flex">
        {sections.map(([href, label]) => (
          <a key={href} href={href} className="hover:underline">
            {label}
          </a>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-2.5">
        <Link href={loginHref} className="flex h-[46px] items-center px-[18px] text-[15px] font-semibold hover:underline">
          {text.signIn}
        </Link>
        <Link href={signupHref} className={cn(LANDING_CTA, "hidden h-[46px] gap-2 bg-brand-ink px-[22px] text-[15px] font-bold text-brand-on-ink sm:inline-flex")}>
          {text.createStore}
          <ArrowRightIcon aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </header>
  )
}
