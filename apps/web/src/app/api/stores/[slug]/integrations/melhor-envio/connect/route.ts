// Next
import { NextResponse, type NextRequest } from "next/server"

// App
import { forwardSignedIn, publicOriginOf, refuseForeignOrigin } from "@/lib/bff"
import { integrationPagesOf } from "@/lib/integration-pages"
import { melhorEnvioPageOf, setIntegrationReturn } from "@/lib/integration-return"
import { signInHrefOf } from "@/lib/panel-return"

/**
 * "Conectar Melhor Envio" (BEELINK-182): a link the panel's page follows, not a fetch — the browser
 * has to leave for Melhor Envio's authorization page. The API makes the state; this sends the browser
 * on, remembering which shop to come back to.
 *
 * A link cannot say it speaks JSON, so the check is the origin alone. Following one planted elsewhere
 * only opens Melhor Envio's page, where nothing happens unless the shopkeeper consents.
 */
export async function GET(request: NextRequest, context: RouteContext<"/api/stores/[slug]/integrations/melhor-envio/connect">): Promise<NextResponse> {
  const refused = refuseForeignOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const origin = publicOriginOf(request)
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${encodeURIComponent(slug)}/integrations/melhor-envio/authorize`, method: "POST" })

  if (status === 401) return NextResponse.redirect(new URL(signInHrefOf(integrationPagesOf(slug).melhorEnvio), origin), 303)
  const url = typeof payload === "object" && payload !== null && "url" in payload && typeof payload.url === "string" ? payload.url : null
  if (status !== 200 || !url) {
    const code = typeof payload === "object" && payload !== null && "errorCode" in payload ? String(payload.errorCode) : "UNKNOWN"
    return NextResponse.redirect(new URL(melhorEnvioPageOf(slug, { error: code }), origin), 303)
  }

  const answer = NextResponse.redirect(url, 303)
  setIntegrationReturn(answer.cookies, slug)
  return answer
}
