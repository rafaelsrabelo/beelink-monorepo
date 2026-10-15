// Block
import { discountPercent, formatCents } from "../blocks/storefront/storefront-price"

/** What a period paid at once comes to: a month of it, and what it saves against paying month by month for as long. */
export interface PeriodFigures {
  monthlyCents: number
  /** Zero for the month itself, and for a period that saves nothing. */
  savingCents: number
  savingPercent: number
}

/**
 * A period's figures, worked out from what it costs whole, how many months it pays for and what one
 * month costs paid month by month — and never written. The landing (BEELINK-318) and the panel's
 * Assinar screen (BEELINK-293) say them from here, so the two cannot round differently.
 *
 * The month's share is rounded up and the saving's percentage down — `discountPercent`'s own rule: a
 * claim about money is never rounded in the favour of whoever makes it.
 */
export function periodFiguresOf(totalCents: number, months: number, monthlyCents: number): PeriodFigures {
  const monthByMonthCents = monthlyCents * months
  const savingCents = Math.max(0, monthByMonthCents - totalCents)

  return {
    monthlyCents: Math.ceil(totalCents / months),
    savingCents,
    savingPercent: savingCents > 0 ? discountPercent(totalCents, monthByMonthCents) : 0,
  }
}

/** Reais in both languages: the plan is sold in Brazil, and only the separators follow the reader. */
const CURRENCY = "BRL"

export function planMoney(cents: number, locale: string): string {
  return formatCents(cents, locale, CURRENCY)
}

/** "10%", as the reader's language writes it. */
export function planPercent(percent: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(percent / 100)
}
