// React
import type { ReactNode } from "react"

// Libs
import { BanknoteIcon, CheckIcon, ClockIcon, MapPinIcon, TruckIcon, type LucideIcon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { LinkComponent } from "../auth/auth-link"
import { LandingCourierForm } from "./landing-courier-form"
import { LANDING_FOCUS_ON_INK } from "./landing-styles"
import { LandingTitle } from "./landing-title"

export interface LandingCouriersProps {
  /**
   * A courier on the road, under the section's lines, drawn to fill the box it is given — the app
   * hands its own optimised image in. Without one the section is black alone.
   */
  photo?: ReactNode
  termsHref: string
  privacyHref: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

const PERK_ICONS: readonly LucideIcon[] = [MapPinIcon, CheckIcon, ClockIcon, BanknoteIcon]

/**
 * "Para entregadores": the black section — what delivering with Beelink would be, the four steps of
 * the sign-up, and the form that starts it, over a courier on the road. The section is the design's; the couriers' app it
 * describes is still to come, which the form says for itself once filled in.
 */
export function LandingCouriers({ photo, termsHref, privacyHref, linkComponent, messages = defaultMessages }: LandingCouriersProps) {
  const text = messages.landing.couriers

  return (
    <section id="entregadores" className="scroll-mt-6 px-4 md:px-10">
      <div className={cn(LANDING_FOCUS_ON_INK, "relative mx-auto flex max-w-[1360px] flex-col gap-12 overflow-hidden rounded-[32px] bg-brand-ink px-6 py-14 text-brand-on-ink md:rounded-[48px] md:px-12 xl:flex-row xl:gap-16 xl:px-[72px] xl:py-24")}>
        {photo ? (
          // Behind the form, fading into the black where the words are: the sentences stay on black.
          // The fade is the photo's own, not the section's: its edge starts in solid black, and no seam shows where it begins.
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 xl:inset-y-0 xl:right-0 xl:left-auto xl:h-full xl:w-[60%]">
            {photo}
            <div className="absolute inset-0 bg-linear-to-b from-brand-ink via-brand-ink/60 to-brand-ink/30 xl:bg-linear-to-r xl:from-brand-ink xl:via-brand-ink/45 xl:to-brand-ink/15" />
          </div>
        ) : null}
        <svg aria-hidden="true" width="420" height="420" viewBox="0 0 420 420" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute -top-20 -right-20 hidden text-brand-yellow opacity-60 md:block">
          <path d="M80 0 C80 60 110 90 160 120 L420 280" />
          <path d="M220 0 C220 40 240 60 280 85 L420 170" />
        </svg>

        <div className="relative flex flex-col gap-[26px] xl:flex-1">
          <span className="flex h-9 items-center gap-2 self-start rounded-full bg-brand-yellow px-4 text-[13px] font-extrabold tracking-[0.06em] text-brand-ink uppercase">
            <TruckIcon aria-hidden="true" className="size-4" />
            {text.tag}
          </span>
          <LandingTitle light={text.titleLight} strong={text.titleStrong} className="text-[44px] leading-[0.98] md:text-[68px]" />
          <p className="max-w-[520px] text-lg leading-[1.6] text-brand-on-ink-text md:text-[19px]">{text.lead}</p>

          <ul className="grid max-w-[600px] gap-3.5 sm:grid-cols-2">
            {text.perks.map((perk, at) => {
              const Icon = PERK_ICONS[at] ?? CheckIcon
              return (
                <li key={perk.title} className="flex items-start gap-3.5 rounded-[20px] border border-brand-ink-line bg-brand-ink-raised p-[18px]">
                  <span className="flex size-[42px] shrink-0 items-center justify-center rounded-xl bg-brand-yellow text-brand-ink">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <b>{perk.title}</b>
                    <span className="text-sm leading-[1.45] text-brand-on-ink-muted">{perk.text}</span>
                  </span>
                </li>
              )
            })}
          </ul>

          <div className="mt-1.5 flex flex-col gap-3">
            <h3 className="text-[13px] font-bold tracking-[0.24em] text-brand-yellow uppercase">{text.flowTitle}</h3>
            {/* Two by two on a phone: four in a row cut the last one off on a narrow screen. The lines between them only make sense in one row. */}
            <ol className="grid max-w-[620px] grid-cols-2 gap-y-4 sm:flex">
              {text.flow.map((label, at) => (
                <li key={label} className="flex flex-1 flex-col gap-2">
                  <span aria-hidden="true" className="flex items-center">
                    <span className="flex size-8 items-center justify-center rounded-full bg-brand-yellow text-sm font-extrabold text-brand-ink">{at + 1}</span>
                    {at < text.flow.length - 1 ? <span className="mx-2 hidden h-0.5 flex-1 bg-brand-on-ink/20 sm:block" /> : null}
                  </span>
                  <span className="pr-2 text-sm font-semibold">{label}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <LandingCourierForm termsHref={termsHref} privacyHref={privacyHref} linkComponent={linkComponent} text={text.form} />
      </div>
    </section>
  )
}
