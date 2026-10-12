// Types
import type { LandingPlanPrices } from "@harness-monorepo/ui/blocks/landing/landing-plans"

/**
 * What Beelink costs, in whole cents, and how long it is tried for free — the one copy (BEELINK-318).
 * The landing draws its "Planos" section, its questions and its two calls from here, and no block or
 * dictionary writes an amount: a line changed here is changed in every sentence that says it.
 *
 * Nothing charges or locks an account yet (BEELINK-218). The billing that does should read these, or
 * take this file's place — never hold a second copy.
 */
export const PLAN_PRICES = {
  trialDays: 7,
  beelink: { monthly: 5990, semiannual: 32340, annual: 57480 },
  withBeelia: { monthly: 8990 },
} as const satisfies LandingPlanPrices
