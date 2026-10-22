// Types
import type { StoreSlugMove } from "@harness-monorepo/contracts"

// App
import { callApi } from "./api"
import { KEPT_COPY_READ_TIMEOUT_MS, keptCopyOf, settledWithin } from "./kept-copy"

/**
 * Which address a page left, and the one it has now (BEELINK-331): this process's copy of the API's
 * table, read by `src/proxy.ts` to lead `/<old>/…` and `/admin/<old>/…` to the new address for good.
 * Read again once a minute (`kept-copy.ts`), so an address that just changed answers as one nobody
 * holds — a 404 — for up to that long. The panel of the page that changed goes to the new address on
 * its own, and needs none of this.
 */

export interface ShopMoves {
  /** The address the page has now, for an address it left; null for any other. */
  currentOf(slug: string): string | null
}

/** The table, of the rows that are one: both addresses spelled as a slug is. */
function movesOf(entries: readonly StoreSlugMove[]): ShopMoves {
  const moves = new Map<string, string>()

  for (const entry of entries) {
    if (typeof entry?.from !== "string" || typeof entry.to !== "string") continue
    if (!/^[a-z0-9-]+$/.test(entry.from) || !/^[a-z0-9-]+$/.test(entry.to) || entry.from === entry.to) continue
    moves.set(entry.from, entry.to)
  }

  return { currentOf: (slug) => moves.get(slug) ?? null }
}

const NO_MOVES = movesOf([])

/** The copy of the table over one way of reading it. */
export function createShopMoves(read: () => Promise<StoreSlugMove[]>, now: () => number = Date.now): () => Promise<ShopMoves> {
  return keptCopyOf(async () => movesOf(await read()), NO_MOVES, now)
}

/** `GET /store-slug-moves`, over the internal network, with no session. */
async function readFromApi(): Promise<StoreSlugMove[]> {
  const response = await settledWithin(callApi({ path: "/store-slug-moves", method: "GET" }), KEPT_COPY_READ_TIMEOUT_MS)
  if (!response.ok) throw new Error(`The table of addresses left answered ${response.status}`)

  const entries: unknown = await response.json()
  if (!Array.isArray(entries)) throw new Error("The table of addresses left is not a list")

  return entries as StoreSlugMove[]
}

/** This process's copy. */
export const shopMoves = createShopMoves(readFromApi)
