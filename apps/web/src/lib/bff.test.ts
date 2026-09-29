// Libs
import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"

// App
import { publicOriginOf, refuseForeignOrigin } from "./bff"

// What the server sees in production: Traefik in front, the standalone server bound to 0.0.0.0:3000.
function behindTheProxy(headers: Record<string, string>): NextRequest {
  return new NextRequest("https://0.0.0.0:3000/api/session", { method: "POST", headers })
}

describe("publicOriginOf", () => {
  it("is the host the proxy was asked for, never the address the server binds", () => {
    expect(publicOriginOf(behindTheProxy({ "x-forwarded-host": "link.beecoders.net" }))).toBe("https://link.beecoders.net")
  })

  it("takes the first host when a chain of proxies listed several", () => {
    expect(publicOriginOf(behindTheProxy({ "x-forwarded-host": "link.beecoders.net, traefik" }))).toBe("https://link.beecoders.net")
  })

  it("falls back to the host header, then to the request's own address", () => {
    expect(publicOriginOf(behindTheProxy({ host: "link.beecoders.net" }))).toBe("https://link.beecoders.net")
    expect(publicOriginOf(new NextRequest("http://localhost:3000/api/session"))).toBe("http://localhost:3000")
  })
})

describe("refuseForeignOrigin", () => {
  it("lets the site's own page through behind the proxy", () => {
    const own = behindTheProxy({ origin: "https://link.beecoders.net", "x-forwarded-host": "link.beecoders.net" })

    expect(refuseForeignOrigin(own)).toBeNull()
  })

  it("refuses another site behind the proxy, and the bind address is no pass", () => {
    const foreign = behindTheProxy({ origin: "https://evil.example", "x-forwarded-host": "link.beecoders.net" })
    const bound = behindTheProxy({ origin: "https://0.0.0.0:3000", "x-forwarded-host": "link.beecoders.net" })

    expect(refuseForeignOrigin(foreign)?.status).toBe(403)
    expect(refuseForeignOrigin(bound)?.status).toBe(403)
  })
})
