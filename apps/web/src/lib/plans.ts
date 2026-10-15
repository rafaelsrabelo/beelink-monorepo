// Types
import type { LandingPlanPrices } from "@harness-monorepo/ui/blocks/landing/landing-plans"

/**
 * What Beelink costs, in whole cents, and how long it is tried for free — the landing's copy
 * (BEELINK-318). The landing draws its "Planos" section, its questions and its two calls from here,
 * and no block or dictionary writes an amount: a line changed here is changed in every sentence that
 * says it.
 *
 * THERE IS A SECOND COPY, and the two must agree (BEELINK-219). What the billing charges is the
 * API's: the prices in `apps/api/prisma/seed/plans.sql`, which every deploy writes to the `plans`
 * table, and the trial's days in `TRIAL_DAYS` (`apps/api/src/modules/billing/billing.constants.ts`),
 * both served at `GET /api/billing/plans` — which the panel's Assinar screen reads (BEELINK-293). The
 * landing keeps this copy on purpose: it is drawn on the server and must not wait on the API, nor
 * lose its prices when the API is down. A price or the trial changed here is changed there in the
 * same commit, and `web/landing-prices-match-api` in `scripts/arch-gates.sh` refuses one that is not.
 *
 * Nothing charges or locks a page while `BILLING_ENFORCED` is off (BEELINK-218).
 */
export const PLAN_PRICES = {
  trialDays: 7,
  beelink: { monthly: 5990, semiannual: 32340, annual: 57480 },
  withBeelia: { monthly: 8990 },
} as const satisfies LandingPlanPrices
