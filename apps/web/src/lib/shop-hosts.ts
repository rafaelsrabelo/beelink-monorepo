// Types
import type { CustomDomainEntry } from "@harness-monorepo/contracts"

// App
import { callApi } from "./api"

/**
 * Which host is which shop's (BEELINK-283): this process's copy of the table the API keeps, read by
 * `src/proxy.ts` to tell a request that arrived by a shop's own domain from every other.
 *
 * A copy and not a read per request: the proxy runs on every one. It is asked for again once a
 * minute, so a domain that changes — saved, activated, removed — takes up to a minute to change
 * what a visitor is served. Nothing can drop it sooner: the proxy may be given no module and no
 * global in common with the rest of the app, so a route handler has no way to reach this copy.
 */

/** How long a read stands. */
export const SHOP_HOSTS_FRESH_MS = 60_000

/**
 * How soon a read that failed is tried again. Not at once: with the API out, every request would
 * wait on a call that cannot answer.
 */
export const SHOP_HOSTS_RETRY_MS = 5_000

/**
 * How long a read may take. Every request to a shop's page waits on the one in flight, and `fetch`
 * gives an API that accepts the connection and never answers five minutes of its own: a read this
 * late is a read that failed, and the last copy goes on standing.
 */
export const SHOP_HOSTS_READ_TIMEOUT_MS = 3_000

export interface ShopHosts {
  /** The shop whose own, active domain this host is; null for any other host. */
  slugOf(host: string): string | null
  /** The shop's own domain, while it is active; null for a shop with none. */
  hostOf(slug: string): string | null
}

/**
 * A host as the table spells one: lower case, with no port and no trailing dot. Of a list — a chain
 * of proxies writes one in `x-forwarded-host` — the first, which is the one the visitor addressed.
 */
export function hostNameOf(raw: string | null | undefined): string {
  const first = (raw ?? "").split(",")[0] ?? ""

  return first.trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "")
}

/**
 * The table, of the active domains alone: a pending one is not a shop's address yet, and to the
 * proxy its host is any other unknown host.
 */
function tableOf(entries: readonly CustomDomainEntry[]): ShopHosts {
  const slugs = new Map<string, string>()
  const hosts = new Map<string, string>()

  for (const entry of entries) {
    if (entry?.status !== "ACTIVE" || typeof entry.host !== "string" || typeof entry.slug !== "string") continue
    const host = hostNameOf(entry.host)
    if (!host) continue
    slugs.set(host, entry.slug)
    hosts.set(entry.slug, host)
  }

  return { slugOf: (host) => slugs.get(hostNameOf(host)) ?? null, hostOf: (slug) => hosts.get(slug) ?? null }
}

const NO_HOSTS = tableOf([])

/**
 * A copy of the table over one way of reading it. While a read stands, it is answered from memory.
 * Past that, the next request waits for a new read — one in flight, shared by every request that
 * arrives meanwhile — rather than be served the old copy: on a quiet site the first visit in hours
 * would otherwise be answered with the table of hours ago. A read that fails keeps the last copy.
 */
export function createShopHosts(read: () => Promise<CustomDomainEntry[]>, now: () => number = Date.now): () => Promise<ShopHosts> {
  let table = NO_HOSTS
  let staleAt = 0
  let flight: Promise<void> | null = null

  async function readAgain(): Promise<void> {
    try {
      table = tableOf(await read())
      staleAt = now() + SHOP_HOSTS_FRESH_MS
    } catch {
      staleAt = now() + SHOP_HOSTS_RETRY_MS
    }
  }

  return async () => {
    if (now() >= staleAt) {
      flight ??= readAgain().finally(() => {
        flight = null
      })
      await flight
    }

    return table
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

/** `GET /custom-domains`, over the internal network, with no session: every saved domain, the pending ones too. */
async function readFromApi(): Promise<CustomDomainEntry[]> {
  const response = await settledWithin(callApi({ path: "/custom-domains", method: "GET" }), SHOP_HOSTS_READ_TIMEOUT_MS)
  if (!response.ok) throw new Error(`The table of shop hosts answered ${response.status}`)

  const entries: unknown = await response.json()
  if (!Array.isArray(entries)) throw new Error("The table of shop hosts is not a list")

  return entries as CustomDomainEntry[]
}

/** This process's copy. */
export const shopHosts = createShopHosts(readFromApi)
