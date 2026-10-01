// Libs
import { afterEach, describe, expect, it, vi } from "vitest"

const incoming = vi.hoisted(() => ({ current: new Headers() }))
vi.mock("next/headers", () => ({ headers: async () => incoming.current }))

import { siteOrigin } from "./site-origin"

afterEach(() => {
  incoming.current = new Headers()
})

describe("siteOrigin", () => {
  /** Behind Traefik the image binds 0.0.0.0:3000, and `host` may say so: the proxy's header is the address the visitor typed. */
  it("is the host the proxy was asked for, over https", async () => {
    incoming.current = new Headers({ "x-forwarded-host": "link.beecoders.net", host: "0.0.0.0:3000" })

    expect(await siteOrigin()).toBe("https://link.beecoders.net")
  })

  it("takes the first host when a chain of proxies lists several", async () => {
    incoming.current = new Headers({ "x-forwarded-host": "link.beecoders.net, internal" })

    expect(await siteOrigin()).toBe("https://link.beecoders.net")
  })

  it("is plain http on a developer's machine, where nothing terminates TLS", async () => {
    incoming.current = new Headers({ host: "localhost:3200" })

    expect(await siteOrigin()).toBe("http://localhost:3200")
  })
})
