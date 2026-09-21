// Types
import type { ApiErrorBody } from "@harness-monorepo/contracts"

// App
import { serverEnv } from "./server-env"

export interface ApiCall {
  path: string
  /** PUT is here because the panel replaces a shop whole, as the legacy PUT already did. */
  method?: "GET" | "POST" | "PUT" | "DELETE"
  body?: unknown
  accessToken?: string
  /** The browser's address, so the API's per-IP rate limit sees people and not this server. */
  clientIp?: string | null
  /**
   * A body handed through untouched, for the one call that carries a file.
   *
   * Streamed rather than read and rebuilt: this app never holds the bytes, so the only ceiling on
   * an upload is the API's, stated once. Buffering here to check a size would be a second number
   * to keep in step with the first, and the pair would disagree inside a quarter.
   */
  rawBody?: { stream: ReadableStream<Uint8Array>; contentType: string }
}

/** Only the server talks to the API; everything the browser sends passes through a route handler. */
export async function callApi({ path, method = "POST", body, accessToken, clientIp, rawBody }: ApiCall): Promise<Response> {
  const headers: Record<string, string> = {}
  if (accessToken) headers.authorization = `Bearer ${accessToken}`
  if (clientIp) headers["x-forwarded-for"] = clientIp

  if (rawBody) {
    // The caller's own content-type, boundary and all. Writing one by hand produces a multipart
    // body the API cannot parse, because the boundary would no longer match the one in the bytes.
    headers["content-type"] = rawBody.contentType

    // `duplex` is required to send a stream and is missing from the DOM lib's RequestInit; the
    // cast is that gap and nothing more.
    return fetch(`${serverEnv.API_URL}${path}`, {
      method,
      headers,
      body: rawBody.stream,
      cache: "no-store",
      duplex: "half",
    } as RequestInit & { duplex: "half" })
  }

  headers["content-type"] = "application/json"

  return fetch(`${serverEnv.API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  })
}

export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === "object" &&
    value !== null &&
    "errorCode" in value &&
    typeof (value as ApiErrorBody).errorCode === "string"
  )
}
