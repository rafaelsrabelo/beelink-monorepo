/**
 * What a customer spends per valid order, in whole cents: the total over the count, to the nearest
 * cent, half a cent rounding up. Null with no valid order — nothing divided by nothing is not zero.
 */
export function averageTicketOf(totalSpentCents: bigint | number, ordersCount: number): number | null {
  if (ordersCount <= 0) return null;
  return Math.round(Number(totalSpentCents) / ordersCount);
}
