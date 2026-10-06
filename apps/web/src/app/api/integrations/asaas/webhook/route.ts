// Next
import { NextResponse, type NextRequest } from "next/server"

// App
import { callApi } from "@/lib/api"

/**
 * Where Asaas tells of a shop's charges (BEELINK-206): the webhook bee-link registers at each shop's
 * own Asaas account is `https://<WEB_DOMAIN>/api/integrations/asaas/webhook` — the API is not public,
 * so the request passes through here. The body goes on as it came, never parsed and written again,
 * with `asaas-access-token` beside it: the token is the shop's, and the API is what knows whose. No
 * session, and none wanted. Nothing here reads the token or logs it.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = request.headers.get("asaas-access-token")
  const response = await callApi({
    path: "/integrations/asaas/webhook",
    rawBody: { stream: request.body ?? new Blob([]).stream(), contentType: request.headers.get("content-type") ?? "application/json" },
    headers: token ? { "asaas-access-token": token } : {},
  }).catch(() => null)

  // Not answered 200, Asaas delivers the event again — and pauses the shop's webhook after fifteen in a row: a 502 says the truth.
  if (!response) return NextResponse.json({ statusCode: 502, errorCode: "UNKNOWN", message: "The API could not be reached" }, { status: 502 })
  const payload: unknown = await response.json().catch(() => null)
  return NextResponse.json(payload ?? {}, { status: response.status })
}
