// Libs
import { ArrowRightIcon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { LANDING_ANCHORS } from "./landing-header"
import { LandingHub } from "./landing-hub"
import { LANDING_CONTAINER, LANDING_CTA } from "./landing-styles"
import { LandingTitle } from "./landing-title"

export interface LandingHeroProps {
  signupHref: string
  /** The free trial, in days, which the line under the two buttons says: the app's one copy, never written here. */
  trialDays: number
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The first screen: what Beelink is, in one sentence, and the way in — with the free trial said
 * under it, in the words the plan's own card uses (BEELINK-318). The hub beside it is the design's
 * picture of the ecosystem, drawn from the width its stage fits in.
 */
export function LandingHero({ signupHref, trialDays, linkComponent: Link = AnchorLink, messages = defaultMessages }: LandingHeroProps) {
  const text = messages.landing.hero

  return (
    <section className={cn(LANDING_CONTAINER, "relative flex items-center gap-10 pt-8 pb-10 md:pt-14")}>
      <div className="flex min-w-0 flex-1 flex-col gap-7">
        <LandingTitle
          as="h1"
          light={text.titleLight}
          strong={text.titleStrong}
          // The design's 92px breaks its light line in two inside the column the hub leaves: the size its lines fit in.
          className="text-[clamp(2.25rem,11.5vw,2.75rem)] leading-[0.98] sm:text-6xl xl:text-[72px] min-[90rem]:text-[84px]"
          lightClassName="text-[0.935em]"
        />
        <p className="max-w-[540px] text-lg leading-[1.55] text-brand-text md:text-xl">{text.lead}</p>
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-3">
            <Link href={signupHref} className={cn(LANDING_CTA, "h-[58px] bg-brand-yellow px-[30px] text-[17px] font-extrabold")}>
              {text.start}
              <ArrowRightIcon aria-hidden="true" className="size-[18px]" />
            </Link>
            <a href={LANDING_ANCHORS.solutions} className={cn(LANDING_CTA, "h-[58px] border-[1.5px] border-brand-ink px-[26px] text-base font-bold")}>
              {text.solutions}
            </a>
          </div>
          <p className="text-[15px] font-semibold text-brand-text">{format(messages.landing.plans.trial, { days: String(trialDays) })}</p>
        </div>
        <div className="mt-3 flex flex-col gap-3">
          <span aria-hidden="true" className="h-1 w-14 rounded bg-brand-yellow" />
          <p className="text-[13px] font-semibold tracking-[0.32em] uppercase">{text.tagline}</p>
        </div>
      </div>
      <LandingHub className="hidden xl:block" messages={messages} />
    </section>
  )
}
