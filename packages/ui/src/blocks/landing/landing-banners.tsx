// Libs
import { CalendarDaysIcon, CheckIcon, CreditCardIcon, MapPinIcon, MessageCircleIcon, ShoppingBagIcon, type LucideIcon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { LANDING_ANCHORS } from "./landing-header"
import { LandingPhoneBanner } from "./landing-phone-banner"
import { LandingRail } from "./landing-rail"
import { LANDING_CTA, LANDING_FOCUS_ON_INK, LANDING_LIFT } from "./landing-styles"
import { LandingTitle } from "./landing-title"

export interface LandingBannersProps {
  signupHref: string
  /** A shop to look at; without one the banner offers only the way in. */
  exampleHref?: string | null
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** A banner in the row: a phone's width on a phone — less on one narrower than the banner and its gutters — and the design's 600px from there. */
const SLIDE = "w-[min(20rem,calc(100vw-3rem))] shrink-0 snap-start sm:w-[600px]"
const BANNER = "flex h-full min-h-[480px] flex-col gap-[22px] rounded-[36px] p-7 sm:h-[580px] sm:p-12"
const TAG = "flex h-9 items-center self-start rounded-full border-[1.5px] px-4 text-[13px] font-bold tracking-[0.06em] uppercase"
const TITLE = "text-4xl leading-[1.02] font-extrabold tracking-[-0.035em] sm:text-[54px]"
const STORE_ICONS: readonly LucideIcon[] = [ShoppingBagIcon, CreditCardIcon, MessageCircleIcon]
const SHIPPING_ICONS: readonly LucideIcon[] = [MapPinIcon, CheckIcon, CalendarDaysIcon]

function Points({ points, icons, tone }: { points: readonly string[]; icons: readonly LucideIcon[]; tone: "ink" | "yellow" }) {
  return (
    <ul className="flex flex-col gap-3 font-medium">
      {points.map((point, at) => {
        const Icon = icons[at] ?? CheckIcon
        return (
          <li key={point} className="flex items-center gap-3">
            <span className={cn("flex size-[30px] shrink-0 items-center justify-center rounded-full", tone === "ink" ? "bg-brand-ink/10" : "bg-brand-yellow/20 text-brand-yellow")}>
              <Icon aria-hidden="true" className="size-4" />
            </span>
            {point}
          </li>
        )
      })}
    </ul>
  )
}

/**
 * "Soluções": three banners in a row that runs past the page's edge — the shop, a phone with one on
 * it, and the deliveries. Each says one thing and has one way on.
 */
export function LandingBanners({ signupHref, exampleHref = null, linkComponent: Link = AnchorLink, messages = defaultMessages }: LandingBannersProps) {
  const text = messages.landing.banners

  return (
    <section id="solucoes" className="relative scroll-mt-6 pt-14 pb-10 md:pt-[72px]">
      <LandingRail
        heading={<LandingTitle light={text.titleLight} strong={text.titleStrong} strongFirst dot={false} className="text-3xl leading-[1.05] tracking-[-0.03em] md:text-5xl" />}
        label={text.label}
        previousLabel={text.previous}
        nextLabel={text.next}
        position={text.position}
        count={3}
      >
        <li className={SLIDE}>
          <article className={cn(LANDING_LIFT, BANNER, "bg-brand-yellow")}>
            <span className={cn(TAG, "border-brand-ink/35")}>{text.store.tag}</span>
            <h3 className={TITLE}>{text.store.title}</h3>
            <p className="text-lg leading-[1.55]">{text.store.text}</p>
            <Points points={text.store.points} icons={STORE_ICONS} tone="ink" />
            <div className="mt-auto flex flex-wrap gap-3">
              <Link href={signupHref} className={cn(LANDING_CTA, "h-[54px] bg-brand-ink px-[26px] font-bold text-brand-on-ink")}>
                {messages.landing.createStore}
              </Link>
              {exampleHref ? (
                <Link href={exampleHref} className={cn(LANDING_CTA, "h-[54px] border-[1.5px] border-brand-ink px-6 font-bold")}>
                  {text.store.example}
                </Link>
              ) : null}
            </div>
          </article>
        </li>
        <li className={SLIDE}>
          <LandingPhoneBanner messages={messages} />
        </li>
        <li className={SLIDE}>
          <article className={cn(LANDING_LIFT, LANDING_FOCUS_ON_INK, BANNER, "bg-brand-ink text-brand-on-ink")}>
            <span className={cn(TAG, "border-brand-on-ink/35")}>{text.shipping.tag}</span>
            <h3 className={TITLE}>
              {text.shipping.title}
              <span aria-hidden="true" className="text-brand-yellow">
                .
              </span>
            </h3>
            <p className="text-lg leading-[1.55] text-brand-on-ink-text">{text.shipping.text}</p>
            <Points points={text.shipping.points} icons={SHIPPING_ICONS} tone="yellow" />
            <div className="mt-auto flex">
              <a href={LANDING_ANCHORS.couriers} className={cn(LANDING_CTA, "h-[54px] bg-brand-yellow px-[26px] font-extrabold text-brand-ink")}>
                {text.shipping.cta}
              </a>
            </div>
          </article>
        </li>
      </LandingRail>
    </section>
  )
}
