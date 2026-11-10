/** One product chosen for a kit's line, as an order names it: how many of it go in each kit. */
export interface KitPartLine {
  productName: string
  quantity: number
}

/**
 * What went in a kit, in one line — "3× Ninho com Nutella · 2× Paçoquinha" (plan
 * 2026-11-10--kits-monte-seu-kit): the panel's order, the customer's, the receipt and the cart all
 * say it the same way. Null on a line that is no kit.
 */
export function kitPartsTextOf(parts: readonly KitPartLine[] | undefined): string | null {
  return parts?.length ? parts.map((part) => `${part.quantity}× ${part.productName}`).join(" · ") : null
}
