// Types
import type { PricesChangeAtHeader } from "@harness-monorepo/contracts"

// App
import { serverEnv } from "./server-env"

export interface PublicApiCall {
  path: string
  /** Seconds a cached answer stays fresh. The storefront trades a minute of staleness for speed. */
  revalidate?: number
  /** Cache tags, so an admin write can drop this answer early — the tags live in ./revalidate. */
  tags?: string[]
}

const PRICES_CHANGE_AT_HEADER = "x-prices-change-at" satisfies PricesChangeAtHeader

/**
 * The anonymous read path of the public storefront: a Server Component calls this directly, and
 * what it answers is cached and served as HTML to people and crawlers alike.
 *
 * It deliberately does not reuse callApi. callApi pins `cache: "no-store"`, which is right for a
 * session and wrong for a shop that has to be fast and indexable. There is no accessToken argument
 * either, and that is the invariant: no token ever travels on this path, so nothing cached here can
 * be one visitor's private answer served to the next.
 *
 * This is not a breach of "the browser never calls the API" — the subject of that rule is the
 * browser. ./session.ts is the precedent for server code calling the API straight from a Server
 * Component, and API_URL stays server-only either way.
 *
 * A kept answer is served while it is asked for again — stale-while-revalidate — so its age has no
 * ceiling on a shop nobody visited overnight. That is fine for anything a write changes, since the
 * write drops the tag. A promotion starting or ending is no write: the API says on the answer when
 * its prices next change by themselves, and an answer kept past that instant is not served — it is
 * asked for again, uncached, for this one request, while the cache catches up behind it.
 */
export async function callPublicApi({ path, revalidate = 60, tags }: PublicApiCall): Promise<Response> {
  const url = `${serverEnv.API_URL}${path}`
  const headers = { accept: "application/json" }
  const kept = await fetch(url, { method: "GET", headers, next: { revalidate, tags } })

  const pricesChangeAt = Date.parse(kept.headers.get(PRICES_CHANGE_AT_HEADER) ?? "")
  if (Number.isNaN(pricesChangeAt) || pricesChangeAt > Date.now()) return kept
  return fetch(url, { method: "GET", headers, cache: "no-store" })
}
