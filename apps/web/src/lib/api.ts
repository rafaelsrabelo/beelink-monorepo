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
}

/** Only the server talks to the API; everything the browser sends passes through a route handler. */
export async function callApi({ path, method = "POST", body, accessToken, clientIp }: ApiCall): Promise<Response> {
  const headers: Record<string, string> = { "content-type": "application/json" }
  if (accessToken) headers.authorization = `Bearer ${accessToken}`
  if (clientIp) headers["x-forwarded-for"] = clientIp

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
