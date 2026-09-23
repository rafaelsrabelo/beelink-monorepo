/**
 * The shapes the `leads` blocks render, restated from `@harness-monorepo/contracts` for the reason
 * `store/store-types.ts` gives: a block renders in Storybook with nothing behind it. Structural, so
 * a screen hands a contract `Lead` straight in.
 */

/** Where a lead stands with the owner. The contract's `LeadStatus`, restated. */
export const LEAD_STATUSES = ["NEW", "CONTACTED", "WON", "LOST"] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]
