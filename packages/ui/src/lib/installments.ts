/*
  "em até 6x de R$ 14,98 sem juros": what a price splits into on a card, by the shop's own terms. The
  same reading the checkout offers its instalments by, so a card never promises what it would refuse.
*/

/** How a shop splits a card payment: its own ceiling, and the least Asaas charges at all and per instalment. */
export interface StorefrontInstallmentTerms {
  /** The most instalments the shop takes, with no interest to the customer. */
  maxInstallments: number
  /** In whole cents: a price under it is not charged online. */
  minimumChargeCents: number
  /** In whole cents: no instalment goes under it. */
  minimumInstallmentCents: number
}

export interface StorefrontInstallment {
  count: number
  /** Rounded down, as the checkout says it: the cent left over goes on the bill, never on the promise. */
  amountCents: number
}

/** The most instalments this price splits into — null when it is paid in full only, which is not worth a line. */
export function installmentOf(priceCents: number, terms: StorefrontInstallmentTerms): StorefrontInstallment | null {
  if (priceCents < terms.minimumChargeCents || terms.minimumInstallmentCents <= 0) return null
  const count = Math.min(terms.maxInstallments, Math.floor(priceCents / terms.minimumInstallmentCents))
  return count < 2 ? null : { count, amountCents: Math.floor(priceCents / count) }
}
