// Libs
import { ArrowRightIcon, CheckIcon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { LANDING_PLAN_PERIODS, planOfferOf, planValuesOf, type LandingPlanPrices } from "./landing-plan-offers"
import { LandingPlanPeriods } from "./landing-plan-periods"
import { LANDING_CONTAINER, LANDING_CTA } from "./landing-styles"
import { LandingTitle } from "./landing-title"

export type { LandingPlanPrices } from "./landing-plan-offers"

export interface LandingPlansProps {
  /** What the plans cost and how long the trial is: the app's one copy. Nothing below writes an amount. */
  prices: LandingPlanPrices
  /** The page's language: it decides how an amount is written. */
  locale: string
  signupHref: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

const CARD = "flex min-w-0 flex-col rounded-[28px]"
/** A card's two halves: what the plan is and costs, then what it includes — one over the other, and side by side from `lg`. */
const HALVES = "grid gap-7 p-6 md:p-8 lg:grid-cols-2 lg:gap-12 lg:p-10"
const INCLUDES = "flex flex-col gap-3.5 border-t-[1.5px] pt-6 lg:border-t-0 lg:border-l-[1.5px] lg:pt-0 lg:pl-12"
const NAME = "text-[26px] font-extrabold tracking-[-0.02em]"
const TEXT = "leading-[1.55] text-brand-text"
const KICKER = "text-[13px] font-bold tracking-[0.12em] uppercase"
const INCLUDED = "flex items-start gap-2.5 text-[15px] leading-[1.45] text-brand-text"

/**
 * "Planos" (BEELINK-318): what Beelink costs, the free trial before it, and what follows the trial.
 *
 * Two cards, one under the other. Beelink's is the one on offer: the trial said first, the three
 * ways of paying (`LandingPlanPeriods`), the way into the sign-up, and what the plan includes — only
 * what the product does today. Beelink with Beelia is announced under it with its price and nothing
 * to press, like Beelia's card in "Integrações": there is nothing yet for a button to lead to.
 *
 * The sign-up is told nothing of the period chosen: no billing exists to receive it.
 */
export function LandingPlans({ prices, locale, signupHref, linkComponent: Link = AnchorLink, messages = defaultMessages }: LandingPlansProps) {
  const text = messages.landing.plans
  const values = planValuesOf(prices, locale)

  return (
    <section id="planos" className={cn(LANDING_CONTAINER, "flex scroll-mt-6 flex-col gap-10 pb-20 md:gap-12 md:pb-[110px]")}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:gap-10">
        <LandingTitle light={text.titleLight} strong={text.titleStrong} className="text-4xl md:text-[56px]" />
        <p className="max-w-[420px] text-lg leading-[1.55] text-brand-text lg:mb-2 lg:ml-auto">{format(text.lead, values)}</p>
      </div>
      <ul className="flex flex-col gap-5">
        <li className={cn(CARD, "overflow-hidden border-2 border-brand-ink bg-brand-surface shadow-sm")}>
          <p className="bg-brand-yellow px-6 py-3.5 text-center text-[17px] font-extrabold tracking-[-0.01em]">{format(text.trial, values)}</p>
          <div className={HALVES}>
            <div className="flex min-w-0 flex-col gap-7">
              <div className="flex flex-col gap-1.5">
                <h3 className={NAME}>{text.beelink.name}</h3>
                <p className={TEXT}>{text.beelink.text}</p>
              </div>
              <LandingPlanPeriods offers={LANDING_PLAN_PERIODS.map((period) => planOfferOf(prices, period))} locale={locale} text={text} />
              <Link href={signupHref} className={cn(LANDING_CTA, "h-[58px] bg-brand-ink px-[30px] text-[17px] font-extrabold text-brand-on-ink")}>
                {format(text.beelink.cta, values)}
                <ArrowRightIcon aria-hidden="true" className="size-[18px]" />
              </Link>
            </div>
            <div className={cn(INCLUDES, "border-brand-line")}>
              <h4 className={KICKER}>{text.includesLabel}</h4>
              <ul className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {text.beelink.includes.map((item) => (
                  <li key={item} className={INCLUDED}>
                    <CheckIcon aria-hidden="true" className="mt-0.5 size-[18px] shrink-0 text-brand-ink" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </li>
        {/* Dashed and on the sand: drawn as what is not here yet, under the card that can be bought. */}
        <li className={cn(CARD, "border-[1.5px] border-dashed border-brand-line-strong bg-brand-sand-soft")}>
          <div className={HALVES}>
            <div className="flex min-w-0 flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                  <h3 className={NAME}>{text.withBeelia.name}</h3>
                  <span className="rounded-full bg-brand-ink px-2.5 py-1 text-xs font-extrabold tracking-[0.12em] whitespace-nowrap text-brand-yellow uppercase">{text.soon}</span>
                </div>
                <p className={TEXT}>{text.withBeelia.text}</p>
              </div>
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[44px] leading-none font-extrabold tracking-[-0.03em] whitespace-nowrap">{values.withBeelia}</span>{" "}
                <span className="font-semibold text-brand-text">{text.perMonth}</span>
              </p>
            </div>
            <div className={cn(INCLUDES, "border-brand-line-strong")}>
              <h4 className={KICKER}>{text.includesLabel}</h4>
              <ul className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {text.withBeelia.includes.map((item) => (
                  <li key={item} className={INCLUDED}>
                    <CheckIcon aria-hidden="true" className="mt-0.5 size-[18px] shrink-0 text-brand-ink" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </li>
      </ul>
      <p className="max-w-[760px] leading-[1.6] text-brand-text">{format(text.after, values)}</p>
    </section>
  )
}
