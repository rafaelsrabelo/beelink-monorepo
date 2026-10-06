/**
 * Money across the line between bee-link and Asaas, and the only place it is converted: whole cents
 * here, a decimal in reais there.
 */

/** 5990 is 59.9: an integer over a hundred prints as the two decimals it has, never a float's tail. */
export function reaisOf(cents: number): number {
  return cents / 100;
}

/** Rounded, not truncated: 59.9 in binary is a hair under 5990 cents. */
export function centsOf(reais: number): number {
  return Math.round(reais * 100);
}
