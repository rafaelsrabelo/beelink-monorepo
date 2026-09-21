// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Types
import type { ApiErrorBody } from "@harness-monorepo/contracts"

// App
import { callApi } from "./api"
import { ACCESS_COOKIE } from "./session-cookies"

function errorBody(statusCode: number, errorCode: string, message: string): ApiErrorBody {
  return { statusCode, errorCode, message }
}

/**
 * Route handlers get none of the origin checking Server Actions have built in, and these ones hold
 * session cookies. A form posted from another site would otherwise reach them with the cookies
 * attached, so a cross-origin request is refused before anything else happens.
 */
export function refuseForeignOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin")

  if (origin !== null && origin !== request.nextUrl.origin) {
    return NextResponse.json(errorBody(403, "FORBIDDEN", "Cross-origin request refused"), { status: 403 })
  }

  return null
}

/**
 * The origin check plus "this request says it speaks JSON" — which a plain cross-site `<form>` post
 * cannot say without asking for a preflight first. Every handler on the admin lane uses it.
 *
 * `/api/uploads` is the one that cannot: a file arrives as `multipart/form-data`, which a form can
 * post, so it takes `refuseForeignOrigin` and carries the reason in its own comment.
 */
export function refuseCrossOrigin(request: NextRequest): NextResponse | null {
  const foreign = refuseForeignOrigin(request)
  if (foreign) return foreign

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

export interface SignedInCall {
  path: string
  method: "GET" | "POST" | "PUT" | "DELETE"
  body?: unknown
}

/** What the API answered, already parsed — never null, so a handler has one shape to forward. */
export interface ApiAnswer {
  status: number
  payload: unknown
}

/**
 * The admin lane: a TanStack Query hook asks this app, this app asks the API. It attaches the
 * access token the browser is not allowed to hold and forwards the caller's address, because the
 * API's per-IP rate limit has to see the person rather than this server.
 *
 * It answers with the body already parsed instead of a NextResponse, so a handler that has to drop
 * what the storefront cached can read the slug out of what it is about to send back.
 */
export async function forwardSignedIn(request: NextRequest, call: SignedInCall): Promise<ApiAnswer> {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value

  // Answered here rather than upstream: without a token the API would answer its own 401, and the
  // round trip buys nothing. The code is the one the screens already turn into a sentence.
  if (!accessToken) {
    return { status: 401, payload: errorBody(401, "AUTH_UNAUTHENTICATED", "Sign in to continue") }
  }

  const response = await callApi({
    path: call.path,
    method: call.method,
    body: call.body,
    accessToken,
    clientIp: clientIpOf(request),
  })

  const payload: unknown = await response.json().catch(() => null)

  return {
    status: response.status,
    payload: payload ?? errorBody(response.status, "UNKNOWN", "Unexpected answer"),
  }
}
