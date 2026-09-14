// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Types
import type { ApiErrorBody } from "@harness-monorepo/contracts"

// App
import { callApi } from "./api"

function errorBody(statusCode: number, errorCode: string, message: string): ApiErrorBody {
  return { statusCode, errorCode, message }
}

/**
 * Route handlers get none of the origin checking Server Actions have built in, and these ones hold
 * session cookies. A form posted from another site would otherwise reach them with the cookies
 * attached, so a cross-origin request is refused before anything else happens.
 */
export function refuseCrossOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin")

  if (origin !== null && origin !== request.nextUrl.origin) {
    return NextResponse.json(errorBody(403, "FORBIDDEN", "Cross-origin request refused"), { status: 403 })
  }

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json(errorBody(415, "UNSUPPORTED_MEDIA_TYPE", "Send JSON"), { status: 415 })
  }

  return null
}

/** Next fills x-forwarded-for from the socket when the header is absent; NextRequest.ip is gone. */
export function clientIpOf(request: NextRequest): string | null {
  return request.headers.get("x-forwarded-for")
}

export async function readJsonBody(request: NextRequest): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

/**
 * Hands a token-free call to the API and answers exactly what it answered. The screens then react
 * to one error shape, whether it came from here or from the API.
 */
export async function forwardToApi(request: NextRequest, path: string): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const response = await callApi({
    path,
    body: (await readJsonBody(request)) ?? {},
    clientIp: clientIpOf(request),
  })

  if (response.status === 204) return new NextResponse(null, { status: 204 })

  const payload: unknown = await response.json().catch(() => null)
  return NextResponse.json(payload ?? errorBody(response.status, "UNKNOWN", "Unexpected answer"), {
    status: response.status,
  })
}
