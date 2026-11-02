/**
 * The order being arranged, over the list the shop has now. What left the shop leaves the order, and
 * what joined it goes to the end, which is where the API puts a new product. The API refuses any list
 * that is not exactly the shop's, so this is what lets a save go through after another tab's write.
 */
export function reconciledOrder(draft: readonly string[], current: readonly string[]): string[] {
  const inShop = new Set(current)
  const kept = draft.filter((id) => inShop.has(id))
  const placed = new Set(kept)

  return [...kept, ...current.filter((id) => !placed.has(id))]
}

export function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, at) => id === b[at])
}
