// Next
import { NextResponse, type NextRequest } from "next/server"

// Types
import type { ApiErrorBody } from "@harness-monorepo/contracts"

// App
import { callApi } from "@/lib/api"
import { clientIpOf, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { clearCustomerSessionCookies, setCustomerSessionCookies } from "@/lib/customer-session-cookies"
import { marketingConsentAt, orderOriginOf } from "@/lib/order-origin"
import { callAsShopper } from "@/lib/shopper-call"

function isCart(body: unknown): body is Record<string, unknown> {
  return typeof body === "object" && body !== null && !Array.isArray(body)
}

function withoutOrigin(cart: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(cart).filter(([field]) => field !== "origin" && field !== "marketingConsent"))
}

function refusal(statusCode: number, errorCode: string, message: string) {
  return NextResponse.json({ statusCode, errorCode, message } satisfies ApiErrorBody, { status: statusCode })
}

/**
 * The cart's "Fechar pedido": the signed-in shopper's order, placed at the API with their session.
 *
 * Under the shop's own path, not `/api`: the shopper's cookies live on `/<slug>` and reach no
 * handler anywhere else. JSON with the origin check, as the panel's lane: a cross-site form cannot
 * place an order in the shopper's name. The API's answer goes back as it came — the placed order,
 * or its refusal and code — with a renewed pair stored on the way.
 *
 * Where the buyer came from, and their yes to the shop's pixel, are read here and nowhere else
 * (BEELINK-275): from the shop's own cookies on this request, which is why this handler is under
 * the shop's path. What the page's body says in those two fields is dropped — a script on the page
 * does not get to say which campaign sold, nor that its visitor consented.
 */
export async function POST(request: NextRequest, { params }: RouteContext<"/[slug]/api/orders">) {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await params
  // The segment arrives decoded: a slug with a slash would reach another of the API's routes.
  if (!/^[a-z0-9-]+$/.test(slug)) return refusal(404, "NOT_FOUND", "No such shop")

  const sent = (await readJsonBody(request)) ?? {}
  // Anything but an object is the API's to refuse, as it came.
  const body = isCart(sent) ? { ...withoutOrigin(sent), ...orderOriginOf(request, slug, await marketingConsentAt(request, slug), Date.now()) } : sent
  const clientIp = clientIpOf(request)
  const placed = await callAsShopper(request, slug, (accessToken) =>
    callApi({ path: `/stores/${encodeURIComponent(slug)}/customer/orders`, body, accessToken, clientIp }).catch(() => null),
  )

  if (placed.status === "signedOut") {
    const answer = refusal(401, "AUTH_UNAUTHENTICATED", "Sign in to place the order")
    clearCustomerSessionCookies(answer.cookies, slug)
    return answer
  }
  if (!placed.response) return refusal(502, "UNKNOWN", "The shop could not be reached")

  const payload: unknown = await placed.response.json().catch(() => null)
  const answer = NextResponse.json(payload ?? { statusCode: placed.response.status, errorCode: "UNKNOWN", message: "Unexpected answer" }, {
    status: placed.response.status,
  })
  if (placed.renewed) setCustomerSessionCookies(answer.cookies, slug, placed.renewed)
  return answer
}
