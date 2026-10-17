/**
 * A table of the API's that `src/proxy.ts` keeps in memory rather than read per request — which host
 * is which shop's (`shop-hosts.ts`), which address a page left (`shop-moves.ts`): the proxy runs on
 * every request. Nothing can drop a copy sooner than it goes stale: the proxy may be given no module
 * and no global in common with the rest of the app, so a route handler has no way to reach it.
 */

/** How long a read stands. */
export const KEPT_COPY_FRESH_MS = 60_000

/**
 * How soon a read that failed is tried again. Not at once: with the API out, every request would
 * wait on a call that cannot answer.
 */
export const KEPT_COPY_RETRY_MS = 5_000

/**
 * How long a read may take. Every request to a shop's page waits on the one in flight, and `fetch`
 * gives an API that accepts the connection and never answers five minutes of its own: a read this
 * late is a read that failed, and the last copy goes on standing.
 */
export const KEPT_COPY_READ_TIMEOUT_MS = 3_000

/**
 * A copy over one way of reading it. While a read stands, it is answered from memory. Past that,
 * the next request waits for a new read — one in flight, shared by every request that arrives
 * meanwhile — rather than be served the old copy: on a quiet site the first visit in hours would
 * otherwise be answered with the table of hours ago. A read that fails keeps the last copy; `empty`
 * is the copy before any read worked.
 */
export function keptCopyOf<T>(read: () => Promise<T>, empty: T, now: () => number = Date.now): () => Promise<T> {
  let copy = empty
  let staleAt = 0
  let flight: Promise<void> | null = null

  async function readAgain(): Promise<void> {
    try {
      copy = await read()
      staleAt = now() + KEPT_COPY_FRESH_MS
    } catch {
      staleAt = now() + KEPT_COPY_RETRY_MS
    }
  }

  return async () => {
    if (now() >= staleAt) {
      flight ??= readAgain().finally(() => {
        flight = null
      })
      await flight
    }

    return copy
  }
}

/** What `work` settles to, or a rejection once `ms` have passed without it. */
export function settledWithin<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`No answer in ${ms} ms`)), ms)
  })

  return Promise.race([work, late]).finally(() => clearTimeout(timer))
}
