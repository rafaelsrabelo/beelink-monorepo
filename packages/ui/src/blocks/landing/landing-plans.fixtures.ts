// Block
import type { LandingPlanPrices } from "./landing-plan-offers"

/**
 * Prices and a trial for the stories and the tests — not Beelink's, on purpose. A figure written by
 * hand in a block or a dictionary would stand on the page beside these, which is how the block's
 * test finds one; and nothing here goes stale the day a real price changes. Beelink's own are in
 * `apps/web/src/lib/plans.ts`, and nowhere else.
 */
export const examplePlanPrices: LandingPlanPrices = {
  trialDays: 14,
  beelink: { monthly: 10000, semiannual: 54000, annual: 96000 },
  withBeelia: { monthly: 15000 },
}
