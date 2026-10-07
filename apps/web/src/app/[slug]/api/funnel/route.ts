// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Types
import type { FunnelEventInput } from "@harness-monorepo/contracts"

// App
import { callApi } from "@/lib/api"
import { clientIpOf, publicOriginOf, readJsonBody } from "@/lib/bff"
import { COUNTED_FUNNEL_STEPS } from "@/lib/funnel-count"
import { SHOP_SLUG } from "@/lib/shopper-forward"

/** `{"step":"CHECKOUT_START"}` is 25 bytes; nothing a shop window sends here is longer. */
const MAX_BODY_BYTES = 64

const dropped = (status: number) => new NextResponse(null, { status })

/**
 * Where a shop window says a step of its funnel happened (BEELINK-276): a page seen, a product
 * seen, an addition to the cart, a checkout begun. Under the shop's path like everything a
 * visitor's browser asks of a shop — but it reads no cookie, and the page sends it none.
 *
 * All that is forwarded is the step's name and, for the API's per-address limit, the visitor's
 * address, which is stored nowhere. What the API keeps is a number per shop, day and step.
 *
 * It answers with no body, and nobody reads the answer: the page never waits for a count. A
 * request is dropped before the API hears of it unless it comes from a page of this site — a
 * `fetch` from one always names its origin on a POST, and a robot that does not run the page's
 * script never gets here at all. The rest of the guard is the API's limit.
 */
export async function POST(request: NextRequest, context: RouteContext<"/[slug]/api/funnel">): Promise<NextResponse> {
  if (request.headers.get("origin") !== publicOriginOf(request)) return dropped(403)
  if (!request.headers.get("content-type")?.includes("application/json")) return dropped(415)
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return dropped(413)

  const { slug } = await context.params
  if (!SHOP_SLUG.test(slug)) return dropped(404)

  const step = stepOf(await readJsonBody(request))
  if (!step) return dropped(400)

  try {
    const response = await callApi({ path: `/stores/${slug}/funnel-events`, body: { step } satisfies FunnelEventInput, clientIp: clientIpOf(request) })

    return dropped(response.status)
  } catch {
    // The API is away: a count lost, and nothing a visitor's page should be told as an error of its own.
    return dropped(503)
  }
}

function stepOf(body: unknown): FunnelEventInput["step"] | null {
  if (typeof body !== "object" || body === null) return null
  const { step } = body as { step?: unknown }

  return COUNTED_FUNNEL_STEPS.find((known) => known === step) ?? null
}
