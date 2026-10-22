// Types
import type { CustomDomainEntry } from "@harness-monorepo/contracts"

// App
import { callApi } from "./api"
import { KEPT_COPY_READ_TIMEOUT_MS, keptCopyOf, settledWithin } from "./kept-copy"

/**
 * Which host is which shop's (BEELINK-283): this process's copy of the table the API keeps, read by
 * `src/proxy.ts` to tell a request that arrived by a shop's own domain from every other. Read again
 * once a minute (`kept-copy.ts`), so a domain that changes — saved, activated, removed — takes up to
 * a minute to change what a visitor is served.
 */

/** Kept under these names, which the copy of the hosts was the first to have. */
export { KEPT_COPY_FRESH_MS as SHOP_HOSTS_FRESH_MS, KEPT_COPY_READ_TIMEOUT_MS as SHOP_HOSTS_READ_TIMEOUT_MS, KEPT_COPY_RETRY_MS as SHOP_HOSTS_RETRY_MS, settledWithin } from "./kept-copy"

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

/** The copy of the table over one way of reading it (`kept-copy.ts`), a read that is no list taken for one that failed. */
export function createShopHosts(read: () => Promise<CustomDomainEntry[]>, now: () => number = Date.now): () => Promise<ShopHosts> {
  return keptCopyOf(async () => tableOf(await read()), NO_HOSTS, now)
}

/** `GET /custom-domains`, over the internal network, with no session: every saved domain, the pending ones too. */
async function readFromApi(): Promise<CustomDomainEntry[]> {
  const response = await settledWithin(callApi({ path: "/custom-domains", method: "GET" }), KEPT_COPY_READ_TIMEOUT_MS)
  if (!response.ok) throw new Error(`The table of shop hosts answered ${response.status}`)

  const entries: unknown = await response.json()
  if (!Array.isArray(entries)) throw new Error("The table of shop hosts is not a list")

  return entries as CustomDomainEntry[]
}

/** This process's copy. */
export const shopHosts = createShopHosts(readFromApi)
