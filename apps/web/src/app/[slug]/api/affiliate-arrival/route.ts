// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Types
import type { AffiliateVisitInput } from "@harness-monorepo/contracts"

// App
import { AFFILIATE_COOKIE, AFFILIATE_HIDDEN_COOKIE, affiliateVisitOf, encodeAffiliateVisit } from "@/lib/affiliate-cookie"
import { affiliateLinkAt } from "@/lib/affiliate-link"
import { callApi } from "@/lib/api"
import { clientIpOf, publicOriginOf, readJsonBody } from "@/lib/bff"
import { REFRESH_COOKIE } from "@/lib/session-cookies"
import { shopAddressOf, shopHomeOf } from "@/lib/shop-address"
import { SHOP_SLUG } from "@/lib/shopper-forward"

/** `{"slug":"…"}` with the longest `/name` an address could carry; nothing a shop window sends here is longer. */
const MAX_BODY_BYTES = 160
const SLUG_MAX = 80
/**
 * A page read again — reloaded, or opened again from the same link — inside this is the same visit:
 * the link's name stays in the address, and only the shop can tell a reading from an arrival.
 */
const SAME_VISIT_MS = 30 * 60_000

const answer = (status: number) => new NextResponse(null, { status })

/**
 * A visitor arrived by an affiliate's link (IMPULSEIA-105): `/<shop>/<name>`, the shop's front door
 * drawn at the link's own address, or `?afiliado=<name>` on any page of the shop. The shop window's
 * script tells it here, so a link preview that fetches the address without running the page counts
 * nothing and is credited nothing.
 *
 * When the link credits someone, this answers `200` and writes `bl_affiliate` — the affiliate's id
 * and the instant, for the browser's session, on the shop's path, replacing any affiliate before
 * (the last link wins) and any value of the shape it had before — and clears the old
 * `bl_affiliate_hidden`; and it counts the visit, unless the browser
 * holds a panel session — a shopkeeper looking at a shop is not a visit, as the funnel says — or
 * this is the same visit read again, which keeps its instant. A link that credits nobody, or
 * nobody's, is a `204` that writes nothing. A request that is not a page's of this site never
 * reaches the API.
 */
export async function POST(request: NextRequest, context: RouteContext<"/[slug]/api/affiliate-arrival">): Promise<NextResponse> {
  if (request.headers.get("origin") !== publicOriginOf(request)) return answer(403)
  if (!request.headers.get("content-type")?.includes("application/json")) return answer(415)
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return answer(413)

  const { slug } = await context.params
  if (!SHOP_SLUG.test(slug)) return answer(404)

  const asked = linkOf(await readJsonBody(request))
  if (!asked) return answer(400)

  const affiliate = (await affiliateLinkAt(slug, { slug: asked }))?.affiliate ?? null
  if (!affiliate) return answer(204)

  const now = Date.now()
  const kept = affiliateVisitOf(request.cookies.get(AFFILIATE_COOKIE)?.value, now)
  const again = kept?.affiliateId === affiliate.id && now - kept.visitedAt < SAME_VISIT_MS

  if (!again && !request.cookies.has(REFRESH_COOKIE)) {
    // A visit lost is a number one short, and nothing the visitor's page should wait on or be told.
    await callApi({ path: `/stores/${slug}/affiliate-visits`, body: { affiliateId: affiliate.id } satisfies AffiliateVisitInput, clientIp: clientIpOf(request) }).catch(() => null)
  }

  const path = shopHomeOf(shopAddressOf(request.headers, slug))
  const response = answer(200)
  // No Max-Age: the browser's session. An order counts only when the customer came by the link in the same visit.
  response.cookies.set(AFFILIATE_COOKIE, encodeAffiliateVisit({ affiliateId: affiliate.id, visitedAt: again && kept ? kept.visitedAt : now }), {
    path,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
  response.cookies.set(AFFILIATE_HIDDEN_COOKIE, "", { path, maxAge: 0 })
  return response
}

function linkOf(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null
  const { slug } = body as { slug?: unknown }
  return typeof slug === "string" && slug.trim() && slug.length <= SLUG_MAX ? slug.trim() : null
}
