// UI
import { besideOf } from "@harness-monorepo/ui/lib/band-rows"

// Block
import { hasSpan, type ArrangementItem, type ArrangementSpan } from "./arrangement-row"
import type { SpanChange } from "./band-arrangement"

export interface BesideInBand {
  /** The block the newcomer goes right after, by id: its place in the band whatever is hidden around it. */
  afterId: string
  span: ArrangementSpan
  rebalance: readonly SpanChange[]
}

type Placed = Pick<ArrangementItem, "id" | "kind" | "span" | "isActive">

/**
 * A band's blocks as its grid draws them: shown, and taking a slice. The rows are theirs — a hidden
 * block or the strip above the header counted into a row would leave room the page does not have,
 * and a block added "beside" would land below.
 */
export function drawnOf<T extends Placed>(components: readonly T[]): T[] {
  return components.filter((component) => component.isActive && hasSpan(component))
}

/**
 * `besideOf` said in a band's own terms — the block the newcomer follows, and the neighbours that
 * give up room, by id — for the block `id`. Null when that block is not drawn or its row cannot hold
 * one more.
 */
export function besideInBand(components: readonly Placed[], id: string): BesideInBand | null {
  const drawn = drawnOf(components)
  const at = drawn.findIndex((component) => component.id === id)
  const beside = at < 0 ? null : besideOf(drawn.map((component) => component.span), at)
  if (!beside) return null

  const rebalance = beside.rebalance.flatMap(({ index, span }) => {
    const neighbour = drawn[index]?.id
    return neighbour ? [{ id: neighbour, span }] : []
  })
  return { afterId: id, span: beside.span, rebalance }
}
