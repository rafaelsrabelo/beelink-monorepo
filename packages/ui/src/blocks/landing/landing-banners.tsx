// React
import type { ReactNode } from "react"

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
import { LandingRail } from "./landing-rail"
import { LANDING_CTA, LANDING_FOCUS_ON_INK } from "./landing-styles"
import { LandingTitle } from "./landing-title"

export interface LandingBannersProps {
  signupHref: string
  /** A shop to look at; without one the banner offers only the way in. */
  exampleHref?: string | null
  /**
   * What stands behind each banner's words, as the app's own optimised images, each filling the box
   * it is given: the shop's and the deliveries' set a mood and say nothing; the panel's is Beelink's
   * panel on a laptop, read out with `landing.banners.panel.alt`.
   */
  photos: { store: ReactNode; panel: ReactNode; shipping: ReactNode }
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** A banner in the row: a phone's width on a phone — less on one narrower than the banner and its gutters — and the design's 600px from there. */
const SLIDE = "w-[min(20rem,calc(100vw-3rem))] shrink-0 snap-start sm:w-[600px]"
/** The panel's banner is two banners wide, and the gap between them, once the screen holds it whole; below that it is a banner like the others. */
const WIDE_SLIDE = "w-[min(20rem,calc(100vw-3rem))] shrink-0 snap-start sm:w-[600px] xl:w-[min(1218px,calc(100vw-8rem))]"
/** `isolate`: the photo is drawn under the words, and no further down than the banner's own ground. */
const BANNER = "group relative isolate flex h-full min-h-[480px] flex-col gap-[22px] overflow-hidden rounded-[36px] p-7 sm:h-[580px] sm:p-12"
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
 * A banner's photograph, behind its words. The frame holds still and clips; what answers the pointer
 * is the box the app's image fills, which comes closer — never for someone who asked for no motion.
 * The scrim is the banner's own ground, strongest where the words are: they are read against it,
 * whatever the photograph has there.
 */
function Backdrop({ photo, frame, scrim }: { photo: ReactNode; frame: string; scrim: string }) {
  return (
    <div className={cn("pointer-events-none absolute -z-10 overflow-hidden", frame)}>
      <div className="absolute inset-0 transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.06]">{photo}</div>
      <div className={cn("absolute inset-0", scrim)} />
    </div>
  )
}

/**
 * "Soluções": three banners in a row that runs past the page's edge — the shop, the panel on a
 * laptop, and the deliveries. Each says one thing over a photograph of it; the panel's is the wide
 * one. No banner moves under the pointer: the row already does, and the photographs answer instead.
 */
export function LandingBanners({ signupHref, exampleHref = null, photos, linkComponent: Link = AnchorLink, messages = defaultMessages }: LandingBannersProps) {
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
          <article className={cn(BANNER, "bg-brand-yellow")}>
            <Backdrop photo={photos.store} frame="inset-x-0 bottom-0 h-[58%]" scrim="bg-linear-to-b from-brand-yellow via-brand-yellow/80 to-brand-yellow/65" />
            <span className={cn(TAG, "border-brand-ink/35")}>{text.store.tag}</span>
            <h3 className={TITLE}>{text.store.title}</h3>
            <p className="text-lg leading-[1.55]">{text.store.text}</p>
            <Points points={text.store.points} icons={STORE_ICONS} tone="ink" />
            <div className="mt-auto flex flex-wrap gap-3">
              <Link href={signupHref} className={cn(LANDING_CTA, "h-[54px] bg-brand-ink px-[26px] font-bold text-brand-on-ink")}>
                {messages.landing.createStore}
              </Link>
              {exampleHref ? (
                <Link href={exampleHref} className={cn(LANDING_CTA, "h-[54px] border-[1.5px] border-brand-ink bg-brand-yellow px-6 font-bold")}>
                  {text.store.example}
                </Link>
              ) : null}
            </div>
          </article>
        </li>
        <li className={WIDE_SLIDE}>
          <article className={cn(BANNER, "justify-end bg-brand-ink text-brand-on-ink xl:justify-start")}>
            {/* A laptop is wider than it is tall: over the words on a narrow banner, fading down into them, and beside them on the wide one, fading in from the left. */}
            <Backdrop
              photo={photos.panel}
              frame="inset-x-0 top-0 h-[55%] xl:left-[30%] xl:h-full"
              scrim="bg-linear-to-t from-brand-ink via-brand-ink/30 via-35% to-transparent xl:bg-linear-to-r xl:via-brand-ink/40 xl:via-25% xl:to-60%"
            />
            <span className={cn(TAG, "border-brand-on-ink/35")}>{text.panel.tag}</span>
            <h3 className={cn(TITLE, "xl:mt-auto xl:max-w-[400px]")}>
              {text.panel.title}
              <span aria-hidden="true" className="text-brand-yellow">
                .
              </span>
            </h3>
            <p className="text-lg leading-[1.55] text-brand-on-ink-text xl:max-w-[400px]">{text.panel.text}</p>
          </article>
        </li>
        <li className={SLIDE}>
          <article className={cn(LANDING_FOCUS_ON_INK, BANNER, "bg-brand-ink text-brand-on-ink")}>
            <Backdrop photo={photos.shipping} frame="inset-0" scrim="bg-linear-to-r from-brand-ink/95 via-brand-ink/75 to-brand-ink/55" />
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
