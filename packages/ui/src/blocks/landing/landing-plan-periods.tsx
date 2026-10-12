// React
import { useId } from "react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { format } from "@harness-monorepo/ui/locales/index"
import type { LandingPlanPeriodValue, UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { planMoney, planPercent, type LandingPlanOffer } from "./landing-plan-offers"

export interface LandingPlanPeriodsProps {
  /** The periods on offer, in the order they are drawn; the first is the one chosen when the page opens. */
  offers: readonly LandingPlanOffer[]
  /** The page's language: it decides how an amount is written. */
  locale: string
  /** `landing.plans`, where the sentences are. */
  text: UiMessages["landing"]["plans"]
}

/**
 * Each period's figures show while its own radio is the checked one. Written whole, one per period:
 * Tailwind emits only the class names it reads in a source file.
 */
const SHOWN: Record<LandingPlanPeriodValue, string> = {
  monthly: "group-has-[[value=monthly]:checked]/periods:visible",
  semiannual: "group-has-[[value=semiannual]:checked]/periods:visible",
  annual: "group-has-[[value=annual]:checked]/periods:visible",
}

/**
 * How Beelink's plan is paid — by the month, six months at once, or the year — and what each comes
 * to: the amount a month, the amount paid, and the saving against paying month by month.
 *
 * Native radios and no script: the stylesheet shows the figures of the checked one, so the choice
 * works before the page's JavaScript arrives, and a browser that restores a form restores it too.
 * The three sets of figures share one cell and the two not chosen are only made invisible, so the
 * card keeps its height from one choice to the next. Each radio is described by its own figures —
 * hidden or not — which is how a reader hears a period's price on reaching it.
 */
export function LandingPlanPeriods({ offers, locale, text }: LandingPlanPeriodsProps) {
  const id = useId()

  return (
    // `min-w-0`: a fieldset is as wide as its content by default, and would push a phone's page sideways.
    <fieldset className="group/periods flex min-w-0 flex-col gap-5">
      <legend className="mb-3 text-sm font-bold">{text.beelink.periodLabel}</legend>
      <div className="grid grid-cols-3 gap-2">
        {offers.map((offer, at) => (
          // The whole card is the radio's label, as the couriers' form draws a vehicle. Its border and its
          // weight are the same chosen or not: a wider one would rewrap the label and move the card under it.
          // One line, with little padding: three share a 320px phone's row, where "6 meses" would break in two.
          <label
            key={offer.period}
            className="flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-brand-line-strong bg-brand-surface px-1 py-2 text-center text-sm font-bold whitespace-nowrap hover:border-brand-ink sm:text-[15px] has-checked:border-brand-ink has-checked:bg-brand-yellow has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-ink"
          >
            <input type="radio" name={id} value={offer.period} defaultChecked={at === 0} aria-describedby={`${id}-${offer.period}`} className="sr-only" />
            {text.beelink.periods[offer.period]}
            {/* Drawn only: the radio is described by its figures, which say the saving in a sentence. */}
            {offer.savingPercent > 0 ? (
              <span aria-hidden="true" className="rounded-full bg-brand-ink px-2 py-1 text-[11px] leading-none font-extrabold whitespace-nowrap text-brand-yellow">
                {format(text.beelink.less, { percent: planPercent(offer.savingPercent, locale) })}
              </span>
            ) : null}
          </label>
        ))}
      </div>
      <div className="grid">
        {offers.map((offer) => (
          <div key={offer.period} id={`${id}-${offer.period}`} className={cn("invisible col-start-1 row-start-1 flex flex-col gap-1.5", SHOWN[offer.period])}>
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-[44px] leading-none font-extrabold tracking-[-0.03em] whitespace-nowrap">{planMoney(offer.monthlyCents, locale)}</span>{" "}
              <span className="font-semibold text-brand-text">{text.perMonth}</span>
            </p>
            <p className="text-[15px] leading-[1.45] text-brand-text">{format(text.beelink.billed[offer.period], { total: planMoney(offer.totalCents, locale) })}</p>
            {offer.savingCents > 0 ? (
              <p className="text-[15px] leading-[1.45] font-bold">
                {format(text.beelink.saving, { amount: planMoney(offer.savingCents, locale), percent: planPercent(offer.savingPercent, locale) })}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </fieldset>
  )
}
