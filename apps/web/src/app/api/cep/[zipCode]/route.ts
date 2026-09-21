// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Types
import type { ApiErrorBody } from "@harness-monorepo/contracts"

// App
import { refuseCrossOrigin } from "@/lib/bff"
import { ACCESS_COOKIE } from "@/lib/session-cookies"
import { lookupZipCode } from "@/lib/viacep"

/**
 * The only lane that reaches ViaCEP. It is not `forwardSignedIn`: the postcode service is a third
 * party, not this product's API, so nothing is forwarded and no bearer token is attached.
 *
 * It is still closed to strangers. The one consumer is the panel's address tab, and an open
 * handler here is a free ViaCEP proxy carrying this deployment's address rather than the caller's
 * — which is how a shared quota gets spent by someone else.
 *
 * A refusal never blocks the save: the form keeps whatever the shopkeeper typed, and the screen
 * shows the reason beside it. Typing the four fields by hand stays possible at every moment.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/cep/[zipCode]">,
): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  if (!request.cookies.get(ACCESS_COOKIE)) {
    return error(401, "AUTH_UNAUTHENTICATED", "Sign in to continue")
  }

  const { zipCode } = await context.params
  const lookup = await lookupZipCode(zipCode)

  switch (lookup.status) {
    case "found":
      return NextResponse.json(lookup.address, { status: 200 })
    case "invalid":
      return error(400, "CEP_INVALID", "A postcode is eight digits")
    case "not-found":
      return error(404, "CEP_NOT_FOUND", "No address for this postcode")
    case "unavailable":
      // 502 and not 500: this app is healthy and the shopkeeper is not wrong — the postcode
      // service did not answer. The sentence the screen shows says exactly that.
      return error(502, "CEP_UNAVAILABLE", "The postcode service did not answer")
  }
}

function error(statusCode: number, errorCode: string, message: string): NextResponse {
  return NextResponse.json({ statusCode, errorCode, message } satisfies ApiErrorBody, { status: statusCode })
}
