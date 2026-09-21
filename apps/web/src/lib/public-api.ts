// App
import { serverEnv } from "./server-env"

export interface PublicApiCall {
  path: string
  /** Seconds a cached answer stays fresh. The storefront trades a minute of staleness for speed. */
  revalidate?: number
  /** Cache tags, so an admin write can drop this answer early — the tags live in ./revalidate. */
  tags?: string[]
}

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
 */
export async function callPublicApi({ path, revalidate = 60, tags }: PublicApiCall): Promise<Response> {
  return fetch(`${serverEnv.API_URL}${path}`, {
    method: "GET",
    headers: { accept: "application/json" },
    next: { revalidate, tags },
  })
}
