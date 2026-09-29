// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Types
import type { ApiErrorBody } from "@harness-monorepo/contracts"

// App
import { refuseCrossOrigin } from "@/lib/bff"
import { CUSTOMER_ACCESS_COOKIE } from "@/lib/customer-session-cookies"
import { SHOP_SLUG } from "@/lib/shopper-forward"
import { lookupZipCode } from "@/lib/viacep"

/**
 * The shopper's lane to ViaCEP, for the address form at a shop (BEELINK-148). Under the shop's path,
 * where the shopper's session cookie lives, and closed to anyone without one — the panel's lane is
 * closed the same way, so neither is a free postcode proxy. Nothing reaches this product's API.
 */
export async function GET(request: NextRequest, context: RouteContext<"/[slug]/api/cep/[zipCode]">): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, zipCode } = await context.params
  if (!SHOP_SLUG.test(slug)) return error(404, "NOT_FOUND", "No such shop")
  if (!request.cookies.get(CUSTOMER_ACCESS_COOKIE)) return error(401, "AUTH_UNAUTHENTICATED", "Sign in to continue")

  const lookup = await lookupZipCode(zipCode)
  switch (lookup.status) {
    case "found":
      return NextResponse.json(lookup.address, { status: 200 })
    case "invalid":
      return error(400, "CEP_INVALID", "A postcode is eight digits")
    case "not-found":
      return error(404, "CEP_NOT_FOUND", "No address for this postcode")
    case "unavailable":
      return error(502, "CEP_UNAVAILABLE", "The postcode service did not answer")
  }
}

function error(statusCode: number, errorCode: string, message: string): NextResponse {
  return NextResponse.json({ statusCode, errorCode, message } satisfies ApiErrorBody, { status: statusCode })
}
