// App
import { AFFILIATE_KEY } from "./affiliate-cookie"

/** A page's query as the router hands it to a page. */
export type ArrivalQuery = Record<string, string | string[] | undefined>

/**
 * Where `/<shop>/<name>` leads (IMPULSEIA-105): the shop's front door with `?afiliado=<name>`, the one
 * way a link arrives, so the arrival is told from the page and not from here. A link that credits
 * nobody leads to the shop alone. Whatever else the address carried — a campaign's labels — goes
 * along, so the shop still learns where the visitor came from.
 */
export function affiliateArrivalHref(home: string, affiliateSlug: string | null, query: ArrivalQuery): string {
  const carried = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (key === AFFILIATE_KEY || value === undefined) continue
    for (const one of Array.isArray(value) ? value : [value]) carried.append(key, one)
  }
  if (affiliateSlug) carried.set(AFFILIATE_KEY, affiliateSlug)

  const search = carried.toString()
  return search ? `${home}?${search}` : home
}

/** The shop's arrival handler: under its own path, like everything a visitor's browser asks of a shop. */
export function arrivalPathOf(slug: string): string {
  return `/${encodeURIComponent(slug)}/api/affiliate-arrival`
}

/**
 * Tells the shop's arrival handler which link the visitor followed. True when the link credits
 * someone and the handler kept them, so the page should be drawn again with whom it is; false for
 * anything else, a failure included — the shop simply goes on.
 */
export async function arriveByLink(slug: string, affiliateSlug: string): Promise<boolean> {
  try {
    const response = await fetch(arrivalPathOf(slug), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: affiliateSlug }),
      credentials: "same-origin",
      cache: "no-store",
    })
    return response.status === 200
  } catch {
    return false
  }
}
