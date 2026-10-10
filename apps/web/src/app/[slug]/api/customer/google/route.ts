// Node
import { createHash, randomBytes } from "node:crypto"

// Next
import { NextResponse, type NextRequest } from "next/server"

// Types
import type { CustomerSignInOptions } from "@harness-monorepo/contracts"

// App
import { callApi } from "@/lib/api"
import { clientIpOf, publicOriginOf } from "@/lib/bff"
import { GOOGLE_HANDOFF_KEY, setGoogleHandoffCookie } from "@/lib/customer-session-cookies"
import { platformPathOf, shopAddressOf } from "@/lib/shop-address"
import { BACK_KEY, safeBackOf } from "@/lib/storefront-routes"

/**
 * "Continuar com Google" at a shop's own domain (BEELINK-284) — a plain link, as on the platform's
 * host. Google sends every shopper back to one fixed address on the platform's host, so the flow is
 * the platform's from start to end: this only sends the browser there to begin it, and keeps here,
 * in a cookie of this domain, the secret the sign-in is traded with when it comes back
 * (`./session/route.ts`). The hash of the secret goes along as the flow's challenge.
 *
 * The platform's origin is the API's to say (`WEB_URL`): no request names where this leads.
 *
 * A GET with a side effect, on purpose, as the platform's start is: it only begins a flow, bound to
 * the browser that asked.
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/[slug]/api/customer/google">) {
  const { slug } = await params
  // The segment arrives decoded: with `%2Fevil.example`, every `/${slug}` below would be another site.
  if (!/^[a-z0-9-]+$/.test(slug)) return NextResponse.json({ statusCode: 404, errorCode: "NOT_FOUND", message: "No such shop" }, { status: 404 })

  const here = shopAddressOf(request.headers, slug)
  const query = request.nextUrl.searchParams
  const back = safeBackOf(here, query.get(BACK_KEY))
  const signIn = safeBackOf(here, query.get("retorno"))
  // The platform's start keeps to what is under `/<slug>`, which is how its host spells this shop.
  const start = new URLSearchParams({ [BACK_KEY]: platformPathOf(here, back), retorno: platformPathOf(here, signIn) })
  const startPath = `/api/storefront/${slug}/customer/google`

  // By the platform's host there is nothing to carry anywhere: its own start does it all.
  if (!here.ownDomain) return NextResponse.redirect(new URL(`${startPath}?${start.toString()}`, publicOriginOf(request)), 303)

  const response = await callApi({ path: "/customer/sign-in-options", method: "GET", clientIp: clientIpOf(request) }).catch(() => null)
  const options = response?.ok ? ((await response.json().catch(() => null)) as Partial<CustomerSignInOptions> | null) : null
  const platform = options?.google && typeof options.platformOrigin === "string" && URL.canParse(options.platformOrigin) ? new URL(options.platformOrigin).origin : null
  if (!platform) {
    const page = new URL(signIn, publicOriginOf(request))
    page.searchParams.set(BACK_KEY, back)
    page.searchParams.set("erro", response?.ok ? "GOOGLE_SIGN_IN_UNAVAILABLE" : "UNKNOWN")
    return NextResponse.redirect(page, 303)
  }

  // 256 random bits, which never leave this domain's cookie but for the trade, server to server.
  const verifier = randomBytes(32).toString("base64url")
  start.set(GOOGLE_HANDOFF_KEY, createHash("sha256").update(verifier).digest("base64url"))

  const answer = NextResponse.redirect(`${platform}${startPath}?${start.toString()}`, 303)
  setGoogleHandoffCookie(answer.cookies, slug, { verifier, signIn, back })
  return answer
}
