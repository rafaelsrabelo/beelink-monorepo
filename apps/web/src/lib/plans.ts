// Types
import type { LandingPlanPrices } from "@harness-monorepo/ui/blocks/landing/landing-plans"

/**
 * What Beelink costs, in whole cents, and how long it is tried for free — the one copy (BEELINK-318).
 * The landing draws its "Planos" section, its questions and its two calls from here, and no block or
 * dictionary writes an amount: a line changed here is changed in every sentence that says it.
 *
 * THERE IS A SECOND COPY, and the two must agree (BEELINK-219). What the billing will charge is the
 * API's: the prices in `apps/api/prisma/seed/plans.sql`, which every deploy writes to the `plans`
 * table, and the trial's days in `TRIAL_DAYS` (`apps/api/src/modules/billing/billing.constants.ts`).
 * The API serves both at `GET /api/billing/plans`. Until the web reads that answer in place of this
 * file (BEELINK-293), a price or the trial changed here is changed there in the same commit — or the
 * landing promises one amount and the page is charged another. Nothing checks it but whoever edits.
 *
 * Nothing charges or locks a page yet (BEELINK-218).
 */
export const PLAN_PRICES = {
  trialDays: 7,
  beelink: { monthly: 5990, semiannual: 32340, annual: 57480 },
  withBeelia: { monthly: 8990 },
} as const satisfies LandingPlanPrices
