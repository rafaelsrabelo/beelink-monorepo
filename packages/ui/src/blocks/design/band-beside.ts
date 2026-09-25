// UI
import { besideOf } from "@harness-monorepo/ui/lib/band-rows"

// Block
import { hasSpan, type ArrangementItem, type ArrangementSpan } from "./arrangement-row"
import type { SpanChange } from "./band-arrangement"

export interface BesideInBand {
  /** The newcomer's place in the band: right after the block it goes beside. */
  index: number
  span: ArrangementSpan
  rebalance: readonly SpanChange[]
}

/**
 * `besideOf` said in a band's own terms — the newcomer's place, and the neighbours that give up room
 * by id — for the block at `at`. Null when that block takes no slice (the strip above the header) or
 * its row cannot hold one more.
 */
export function besideInBand(components: readonly Pick<ArrangementItem, "id" | "kind" | "span">[], at: number): BesideInBand | null {
  const component = components[at]
  const beside = component && hasSpan(component) ? besideOf(components.map((item) => item.span), at) : null
  if (!beside) return null

  const rebalance = beside.rebalance.flatMap(({ index, span }) => {
    const id = components[index]?.id
    return id ? [{ id, span }] : []
  })
  return { index: at + 1, span: beside.span, rebalance }
}
