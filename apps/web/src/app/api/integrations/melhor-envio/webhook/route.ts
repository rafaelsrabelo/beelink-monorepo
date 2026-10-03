// Next
import { NextResponse, type NextRequest } from "next/server"

// App
import { callApi } from "@/lib/api"

/**
 * Where Melhor Envio tells of every label bee-link's app generated (BEELINK-188), registered once in
 * the app as `https://<WEB_DOMAIN>/api/integrations/melhor-envio/webhook`: the API is not public, so
 * the request passes through here. Its signature is over the bytes that arrived, so they go on as
 * they came — never parsed and written again — with the signature beside them. No session, and none
 * wanted: the API refuses what the app did not sign.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const signature = request.headers.get("x-me-signature")
  const response = await callApi({
    path: "/integrations/melhor-envio/webhook",
    rawBody: { stream: request.body ?? new Blob([]).stream(), contentType: request.headers.get("content-type") ?? "application/json" },
    headers: signature ? { "x-me-signature": signature } : {},
  }).catch(() => null)

  // Not answered, Melhor Envio tries again in 15 minutes: a 502 says so.
  if (!response) return NextResponse.json({ statusCode: 502, errorCode: "UNKNOWN", message: "The API could not be reached" }, { status: 502 })
  const payload: unknown = await response.json().catch(() => null)
  return NextResponse.json(payload ?? {}, { status: response.status })
}
