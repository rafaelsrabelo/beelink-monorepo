// Block
import type { StorefrontSpan } from "../blocks/storefront/storefront-band-cell"

/** Each slice's columns out of twelve, at the computer's width (`storefront-band-cell.tsx`, `shop-lg`). */
export const SPAN_COLUMNS: Record<StorefrontSpan, number> = { FULL: 12, TWO_THIRDS: 8, HALF: 6, THIRD: 4 }

const SPAN_OF_COLUMNS: Partial<Record<number, StorefrontSpan>> = { 4: "THIRD", 6: "HALF", 8: "TWO_THIRDS", 12: "FULL" }

/** A row split evenly: two halves, or three thirds. A third is the narrowest slice there is. */
const EVEN: Partial<Record<number, StorefrontSpan>> = { 2: "HALF", 3: "THIRD" }

/**
 * The rows a band's grid makes of its blocks, as indices into `spans`: each block goes on the
 * current row while it fits in twelve columns, and starts the next one when it does not — which is
 * what CSS grid's auto-placement does with these column spans.
 */
export function rowsOf(spans: readonly StorefrontSpan[]): number[][] {
  const rows: number[][] = []
  let used = 12

  spans.forEach((span, at) => {
    const columns = SPAN_COLUMNS[span]
    if (used + columns > 12) {
      rows.push([at])
      used = columns
    } else {
      rows[rows.length - 1]?.push(at)
      used += columns
    }
  })

  return rows
}

export interface Beside {
  /** The slice the new block takes. */
  span: StorefrontSpan
  /** The blocks of the row that change slice to make room, by index into `spans`. Empty when it fits. */
  rebalance: readonly { index: number; span: StorefrontSpan }[]
}

/**
 * What a block put beside the one at `at` takes, so the two share a row: the same slice as its
 * neighbour when that still fits — a third beside a third, a half beside a half — else the room the
 * row has left, else the row split evenly with it — a whole one and the new one become two halves.
 * Null when the row already holds three: a third is the narrowest slice.
 */
export function besideOf(spans: readonly StorefrontSpan[], at: number): Beside | null {
  const row = rowsOf(spans).find((indices) => indices.includes(at))
  const own = spans[at]
  if (!row || !own) return null

  const free = 12 - row.reduce((sum, index) => sum + SPAN_COLUMNS[spans[index] ?? "FULL"], 0)
  if (free >= SPAN_COLUMNS[own]) return { span: own, rebalance: [] }

  const fits = SPAN_OF_COLUMNS[free]
  if (fits && free > 0) return { span: fits, rebalance: [] }

  const even = EVEN[row.length + 1]
  if (!even) return null
  return { span: even, rebalance: row.filter((index) => spans[index] !== even).map((index) => ({ index, span: even })) }
}

/**
 * The slice a block added at the foot of a band takes: the room its last row has left, so it lands
 * beside rather than under — or a whole row when the last one is full.
 */
export function footSpanOf(spans: readonly StorefrontSpan[]): StorefrontSpan {
  const last = rowsOf(spans).at(-1) ?? []
  const free = 12 - last.reduce((sum, index) => sum + SPAN_COLUMNS[spans[index] ?? "FULL"], 0)
  return (free > 0 && free < 12 && SPAN_OF_COLUMNS[free]) || "FULL"
}
