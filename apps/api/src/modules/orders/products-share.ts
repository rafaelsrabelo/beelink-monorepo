/*
  A share of what an order's products were paid for, line by line (IMPULSEIA-106, decision 6 of the
  affiliates epic): the one split both the cashback an order earns and an affiliate's commission are
  worked out on. Each line's part of what was paid is its own cost over the lines' cost — a coupon, a
  hand discount and credit spent are the order's, taken to come off every line in proportion — and
  its share is that part times the line's rate. Moving one of the two without the other is the
  mistake this file exists to prevent.

  BigInt throughout: cents by basis points by cents is past what a double holds whole.
*/

/** A line as a share reads it: what it costs after its promotion, and its rate in basis points. */
export interface ShareLine {
  netCents: number;
  rateBps: number;
}

/** The lines' rate as a fraction, `weighted / net` basis points: each line's rate weighed by what it costs. */
export interface WeightedRate {
  weighted: bigint;
  net: bigint;
}

export function weightedRateOf(lines: readonly ShareLine[]): WeightedRate {
  return lines.reduce((sum, line) => ({ weighted: sum.weighted + BigInt(line.netCents) * BigInt(line.rateBps), net: sum.net + BigInt(line.netCents) }), { weighted: 0n, net: 0n });
}

/** That rate over `baseCents`, rounded down to the cent; 0 when the lines cost nothing. */
export function shareCentsOf(rate: WeightedRate, baseCents: number): number {
  return rate.net === 0n ? 0 : Number((rate.weighted * BigInt(baseCents)) / (rate.net * 10_000n));
}

/** What one line takes of the base and of the share. */
export interface LineShare {
  baseCents: number;
  shareCents: number;
}

/**
 * Each line's part of the base and of the share, in the lines' order: each rounded down, and the
 * cents left handed to the lines with the largest remainders — the earlier line first on a tie — so
 * the parts add up to the base and the shares to `shareCentsOf` of the same lines, to the cent.
 */
export function lineSharesOf(lines: readonly ShareLine[], baseCents: number): LineShare[] {
  const net = lines.reduce((sum, line) => sum + BigInt(line.netCents), 0n);
  if (net === 0n) return lines.map(() => ({ baseCents: 0, shareCents: 0 }));

  const base = BigInt(baseCents);
  const bases = largestRemainder(lines.map((line) => ({ numerator: BigInt(line.netCents) * base, denominator: net })), baseCents);
  const total = shareCentsOf(weightedRateOf(lines), baseCents);
  const shares = largestRemainder(lines.map((line) => ({ numerator: BigInt(line.netCents) * BigInt(line.rateBps) * base, denominator: net * 10_000n })), total);
  return lines.map((_, index) => ({ baseCents: bases[index]!, shareCents: shares[index]! }));
}

/** Fractions rounded down, then one cent more to the largest remainders until they add up to `total`. */
function largestRemainder(parts: readonly { numerator: bigint; denominator: bigint }[], total: number): number[] {
  const floors = parts.map(({ numerator, denominator }) => numerator / denominator);
  let left = BigInt(total) - floors.reduce((sum, floor) => sum + floor, 0n);
  // Remainders compared as fractions of one common denominator: every part here shares it.
  const order = parts.map((part, index) => ({ index, remainder: part.numerator % part.denominator })).sort((a, b) => (a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1));
  const result = floors.map(Number);
  for (const { index } of order) {
    if (left <= 0n) break;
    result[index]! += 1;
    left -= 1n;
  }
  return result;
}
