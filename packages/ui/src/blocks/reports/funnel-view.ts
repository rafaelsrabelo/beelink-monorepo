// Block
import type { FunnelStepView } from "./report-types"

export interface FunnelRow extends FunnelStepView {
  /** How many of this step for every hundred of the one before; null on the first step, and where the one before counted nothing. */
  per100: number | null
  /** How many fewer than the step before; null on the first step, and where there are as many or more. */
  drop: number | null
  /** The bar's length, from 0 to 1, against the largest step — which need not be the first. */
  share: number
}

/**
 * The funnel's rows from its counts (BEELINK-276): each step against the one before.
 *
 * The steps count events, not people, so nothing makes a step smaller than the one before it — a
 * product goes into the cart from a card without its page being opened. A rate above a hundred is
 * said as it is, a drop is said only where there is one, and the bars are measured against the
 * largest step so none runs past its track.
 */
export function funnelRowsOf(steps: readonly FunnelStepView[]): FunnelRow[] {
  const largest = Math.max(0, ...steps.map((step) => step.count))

  return steps.map((step, at) => {
    const before = at > 0 ? steps[at - 1]!.count : null

    return {
      ...step,
      per100: before ? (step.count / before) * 100 : null,
      drop: before !== null && before > step.count ? before - step.count : null,
      share: largest > 0 ? step.count / largest : 0,
    }
  })
}

/** Whether the shop window counted anything: the purchase alone, read from the orders, is no funnel. */
export function funnelIsEmpty(steps: readonly FunnelStepView[]): boolean {
  return steps.every((step) => step.step === "PURCHASE" || step.count === 0)
}

/** "32,4" for 32.44 and "130" for 130: one decimal at most, in the reader's own notation. */
export function per100Text(per100: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(per100)
}
