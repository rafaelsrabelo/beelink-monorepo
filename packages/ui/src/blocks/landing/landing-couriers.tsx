// React
import type { ReactNode } from "react"

// Libs
import { CheckIcon, TruckIcon } from "lucide-react"

// UI
import { withParts } from "@harness-monorepo/ui/lib/text-parts"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { BeelinkLogo } from "./beelink-logo"
import { LandingTitle } from "./landing-title"

export interface LandingCouriersProps {
  /**
   * The form that starts the sign-up, `landing-courier-form`, already wired by whoever sends it. A
   * slot and not a child drawn here: the form takes the send as a function, and this section is
   * drawn on the server, which cannot hand one to the browser.
   */
  form: ReactNode
  messages?: UiMessages
}

/**
 * "Para entregadores" (BEELINK-329): the yellow band — what delivering with Beelink would be, in one
 * line and four words of advantage, the brand's bag, and the card with the first step of the
 * sign-up. The couriers' app it describes is still to come; what exists is that first step, which
 * puts a person on the list of those who asked to deliver, today in one city, which the line says.
 *
 * The yellow runs from one edge of the screen to the other at every width, and what stands on it
 * keeps the page's column. Beside one another from `lg`: the words, the bag where there is room for
 * it, the card. On a phone the yellow is the words' alone and the card rises over its lower edge,
 * with the four steps of the sign-up under it — there only, as the design has them.
 *
 * The form is drawn once, wherever it stands: it holds what was typed, and two of it would be two
 * forms. So one tree serves both layouts, and the column's gutters are written here and not taken
 * from `LANDING_CONTAINER` — on a phone the yellow has to reach the edges the column stops short of.
 *
 * The bag is the logo's own (`BeelinkLogo`), in the ink: its mark and its two rings are holes, and
 * the yellow shows through them.
 */
export function LandingCouriers({ form, messages = defaultMessages }: LandingCouriersProps) {
  const text = messages.landing.couriers

  return (
    <section id="entregadores" className="relative scroll-mt-6 text-brand-ink lg:overflow-hidden lg:bg-brand-yellow">
      <svg aria-hidden="true" width="420" height="420" viewBox="0 0 420 420" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute -bottom-[200px] -left-[120px] hidden text-brand-ink/20 lg:block">
        <path d="M0 120 L120 200 C170 230 190 270 190 330 V420" />
        <path d="M0 230 L60 270 C100 295 110 330 110 380 V420" />
      </svg>

      <div className="relative mx-auto w-full max-w-[1440px] lg:flex lg:items-center lg:gap-10 lg:px-10 lg:py-10 xl:px-16 min-[90rem]:px-24">
        {/* The room under the words, on a phone, is what the card rises over. */}
        <div className="flex flex-col gap-3 overflow-hidden bg-brand-yellow px-6 pt-7 pb-[94px] md:px-10 lg:flex-1 lg:gap-[18px] lg:overflow-visible lg:bg-transparent lg:p-0">
          <span className="flex h-7 items-center gap-2 self-start rounded-full bg-brand-ink px-3 text-[11px] font-extrabold tracking-[0.08em] text-brand-yellow uppercase lg:h-8 lg:px-3.5 lg:text-xs">
            <TruckIcon aria-hidden="true" className="size-[15px]" />
            {text.tag}
          </span>
          <div className="flex items-center gap-2.5">
            {/* The stop is the sentence's own: the heading's drawn one is yellow, and so is the ground. */}
            {/* Sized by the screen on a phone: beside the bag, the light line has to stay one line. */}
            <LandingTitle light={text.titleLight} strong={text.titleStrong} dot={false} className="flex-1 text-[clamp(1.5rem,8vw,2.125rem)] leading-none lg:text-[52px]" />
            {/* Beside the heading where the row has no room for the bag between the words and the card. */}
            <BeelinkLogo variant="icon" className="h-20 -rotate-[8deg] sm:h-24 xl:hidden" />
          </div>
          <p className="max-w-[460px] text-sm leading-normal lg:text-[17px]">{withParts(text.lead, { city: <b>{text.city}</b> })}</p>
          <ul className="grid max-w-[480px] grid-cols-2 gap-x-2.5 gap-y-2 text-[13px] leading-tight font-bold lg:mt-1 lg:grid-cols-[repeat(2,minmax(0,220px))] lg:gap-x-5 lg:gap-y-2.5 lg:text-[15px]">
            {text.perks.map((perk) => (
              <li key={perk} className="flex items-start gap-1.5 lg:gap-2">
                <CheckIcon aria-hidden="true" strokeWidth={3} className="mt-px size-[15px] shrink-0 lg:size-[18px]" />
                {perk}
              </li>
            ))}
          </ul>
        </div>

        <BeelinkLogo variant="icon" className="hidden h-[230px] -rotate-[8deg] drop-shadow-xl drop-shadow-brand-ink/30 xl:block" />

        <div className="relative -mt-[70px] px-3.5 lg:mt-0 lg:px-0">{form}</div>

        <div className="mx-auto flex w-full max-w-[548px] flex-col gap-3 px-6 py-6 lg:hidden">
          <h3 className="text-[11px] font-extrabold tracking-[0.2em] uppercase">{text.flowTitle}</h3>
          <ol className="grid grid-cols-4 gap-1.5 text-center text-[11px] font-bold">
            {text.flow.map((label, at) => (
              <li key={label} className="flex flex-col items-center gap-1.5">
                {/* The list is ordered: a reader is told the step's place without the drawn number. */}
                <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-full bg-brand-yellow font-extrabold">
                  {at + 1}
                </span>
                {label}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
