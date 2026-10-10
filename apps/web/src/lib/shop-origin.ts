// Next
import type { NextRequest } from "next/server"

// App
import { hostNameOf } from "./shop-hosts"

/** The host the visitor addressed, as `publicOriginOf()` takes it, port and all. */
export function hostAskedOf(request: NextRequest): string {
  return request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host") || request.nextUrl.host
}

/**
 * Where a shop's own domain is, as an origin to redirect to. Https and no port, always — but for a
 * request that arrived by a local host, where nothing terminates TLS and the port is the server's
 * own: development and the e2e go on by the request's scheme and port.
 *
 * `domain` is the shop's active domain as the API has it — the table of hosts, or a sign-in's
 * handoff — and never a value a request brought.
 */
export function shopOriginOf(request: NextRequest, domain: string): string {
  const asked = hostAskedOf(request)
  const name = hostNameOf(asked)
  if (name !== "localhost" && !name.endsWith(".localhost") && name !== "127.0.0.1" && name !== "[::1]") return `https://${domain}`

  const port = /:(\d+)$/.exec(asked)?.[1]
  return `${request.nextUrl.protocol}//${domain}${port ? `:${port}` : ""}`
}
