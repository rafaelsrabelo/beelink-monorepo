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
