// Next
import { NextResponse, type NextRequest } from "next/server"

// App
import { forwardSignedIn, publicOriginOf } from "@/lib/bff"
import { clearIntegrationReturn, integrationReturnOf, melhorEnvioPageOf, INTEGRATION_RETURN_COOKIE } from "@/lib/integration-return"

/**
 * Where Melhor Envio sends every shop's owner back (BEELINK-182) — one fixed address, registered once
 * in bee-link's app there. It arrives with the panel's session: the API takes the code and the state
 * only from the person who began the flow, and answers with the shop it was for.
 *
 * Whatever came of it, the browser lands on that shop's Melhor Envio page, which says so.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const query = request.nextUrl.searchParams
  const origin = publicOriginOf(request)
  const remembered = request.cookies.get(INTEGRATION_RETURN_COOKIE)?.value

  const land = (slug: string | null, result: { connected: string } | { error: string }) => {
    const answer = NextResponse.redirect(new URL(melhorEnvioPageOf(slug, result), origin), 303)
    clearIntegrationReturn(answer.cookies)
    return answer
  }

  const code = query.get("code")
  const state = query.get("state")
  // The shopkeeper said no on Melhor Envio's page, or it came back with nothing to trade.
  if (query.get("error") || !code || !state) return land(integrationReturnOf(remembered), { error: "INTEGRATION_CANCELLED" })

  const { status, payload } = await forwardSignedIn(request, { path: "/integrations/melhor-envio/callback", method: "POST", body: { code, state } })
  const answer = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {}
  if (status === 200) return land(integrationReturnOf(String(answer.storeSlug ?? ""), remembered), { connected: "melhor-envio" })

  const details = typeof answer.details === "object" && answer.details !== null ? (answer.details as Record<string, unknown>) : {}
  return land(integrationReturnOf(typeof details.storeSlug === "string" ? details.storeSlug : null, remembered), { error: typeof answer.errorCode === "string" ? answer.errorCode : "UNKNOWN" })
}
