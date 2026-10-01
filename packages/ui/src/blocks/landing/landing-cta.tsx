// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { BeelinkMark } from "./beelink-mark"
import { LANDING_ANCHORS } from "./landing-header"
import { LANDING_CTA } from "./landing-styles"
import { LandingTitle } from "./landing-title"

export interface LandingCtaProps {
  signupHref: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** The last call, on the brand's yellow: create the shop, or — for whoever came to deliver — the couriers' section. */
export function LandingCta({ signupHref, linkComponent: Link = AnchorLink, messages = defaultMessages }: LandingCtaProps) {
  const text = messages.landing.cta

  return (
    <section className="px-4 md:px-10">
      <div className="relative mx-auto flex max-w-[1360px] flex-col gap-8 overflow-hidden rounded-[32px] bg-brand-yellow px-6 py-14 md:flex-row md:items-center md:gap-12 md:rounded-[48px] md:px-20 md:py-[88px]">
        <BeelinkMark strokeWidth={2.4} className="pointer-events-none absolute -top-5 right-[60px] hidden size-[380px] text-brand-ink/10 md:block" />
        {/* The sentence carries its own full stop: on the yellow, a yellow one would not show. */}
        <LandingTitle light={text.titleLight} strong={text.titleStrong} dot={false} className="relative text-[40px] leading-[0.98] md:text-[64px]" />
        <div className="relative flex flex-col gap-3 md:ml-auto">
          <Link href={signupHref} className={cn(LANDING_CTA, "h-[62px] bg-brand-ink px-8 text-lg font-extrabold text-brand-on-ink")}>
            {messages.landing.createStore}
          </Link>
          <a href={LANDING_ANCHORS.couriers} className={cn(LANDING_CTA, "h-[62px] border-2 border-brand-ink px-8 text-lg font-extrabold")}>
            {text.courier}
          </a>
        </div>
      </div>
    </section>
  )
}
