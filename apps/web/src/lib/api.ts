// Types
import type { ApiErrorBody, PageRevisionHeader } from "@harness-monorepo/contracts"

// App
import { serverEnv } from "./server-env"

/** The header a draft write names the revision it read in; the API refuses a stale one with 409. */
export const PAGE_REVISION_HEADER = "x-page-revision" satisfies PageRevisionHeader

export interface ApiCall {
  path: string
  /**
   * PUT is here because the panel replaces a shop whole, as the legacy PUT already did. PATCH is
   * here because a component is the first thing the panel edits a field of at a time — sending a
   * whole one would make every form overwrite the fields it does not draw.
   */
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  accessToken?: string
  /** The browser's address, so the API's per-IP rate limit sees people and not this server. */
  clientIp?: string | null
  /** The page draft revision the editor read, carried to the API as it sent it (`x-page-revision`). */
  pageRevision?: string | null
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
export async function callApi({ path, method = "POST", body, accessToken, clientIp, pageRevision, rawBody }: ApiCall): Promise<Response> {
  const headers: Record<string, string> = {}
  if (accessToken) headers.authorization = `Bearer ${accessToken}`
  if (clientIp) headers["x-forwarded-for"] = clientIp
  if (pageRevision) headers[PAGE_REVISION_HEADER] = pageRevision

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

  /*
    Declared only when there is something to declare it about.

    Fastify refuses a request that says `application/json` and carries nothing — "Body cannot be
    empty when content-type is set to 'application/json'" — so sending it unconditionally broke
    every DELETE in the panel, which has no body by definition. It was reported on a banner and it
    was true of products and categories too.

    This is the server-to-API hop. The browser-to-BFF one still has to announce JSON, and does:
    `refuseCrossOrigin` answers 415 to a request that does not, which is what stops a form posted
    from another site reaching these handlers at all.
  */
  if (body !== undefined) headers["content-type"] = "application/json"

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
