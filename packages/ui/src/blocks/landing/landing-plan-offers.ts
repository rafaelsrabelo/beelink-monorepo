// UI
import { periodFiguresOf, planMoney } from "@harness-monorepo/ui/lib/plan-figures"

// Locales
import type { LandingPlanPeriodValue } from "@harness-monorepo/ui/locales/messages"

export { planMoney, planPercent } from "@harness-monorepo/ui/lib/plan-figures"

/**
 * What Beelink costs, in whole cents, and how long it is tried for free (BEELINK-318). The app holds
 * the one copy and hands it over: no block and no dictionary writes an amount, so a price changes in
 * one line and every sentence that says it follows.
 */
export interface LandingPlanPrices {
  /** The free trial, in days. */
  trialDays: number
  /** Beelink alone: what each period costs, paid at once. */
  beelink: Record<LandingPlanPeriodValue, number>
  /** Beelink with Beelia, a month. */
  withBeelia: { monthly: number }
}

/** A period as the landing says it: what is paid, what that comes to a month, and what it saves. */
export interface LandingPlanOffer {
  period: LandingPlanPeriodValue
  totalCents: number
  monthlyCents: number
  /** Against paying month by month for as long. Zero on the monthly plan, and on a period that saves nothing. */
  savingCents: number
  savingPercent: number
}

/** The months each period pays for: what "semiannual" means, not a price. */
const MONTHS = { monthly: 1, semiannual: 6, annual: 12 } as const satisfies Record<LandingPlanPeriodValue, number>

export const LANDING_PLAN_PERIODS: readonly LandingPlanPeriodValue[] = ["monthly", "semiannual", "annual"]

/** One period's figures, worked out from the two amounts and never written (`periodFiguresOf`). */
export function planOfferOf(prices: LandingPlanPrices, period: LandingPlanPeriodValue): LandingPlanOffer {
  const totalCents = prices.beelink[period]

  return { period, totalCents, ...periodFiguresOf(totalCents, MONTHS[period], prices.beelink.monthly) }
}

/**
 * What fills a landing sentence's placeholders — `{days}`, `{monthly}`, `{semiannual}`,
 * `{semiannualMonthly}`, `{annual}`, `{annualMonthly}`, `{withBeelia}` — through `format()`.
 */
export function planValuesOf(prices: LandingPlanPrices, locale: string): Record<string, string> {
  const semiannual = planOfferOf(prices, "semiannual")
  const annual = planOfferOf(prices, "annual")

  return {
    days: String(prices.trialDays),
    monthly: planMoney(prices.beelink.monthly, locale),
    semiannual: planMoney(semiannual.totalCents, locale),
    semiannualMonthly: planMoney(semiannual.monthlyCents, locale),
    annual: planMoney(annual.totalCents, locale),
    annualMonthly: planMoney(annual.monthlyCents, locale),
    withBeelia: planMoney(prices.withBeelia.monthly, locale),
  }
}
