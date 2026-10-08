// Libs
import { NextResponse } from "next/server"
import { describe, expect, it } from "vitest"

// App
import { clearCustomerSessionCookies, setCustomerSessionCookies } from "./customer-session-cookies"

const SESSION = {
  accessToken: "shopper-access",
  accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(),
  refreshToken: "shopper-refresh",
  refreshTokenExpiresAt: new Date(Date.now() + 2_592_000_000).toISOString(),
  user: { id: "1", name: "Bia", email: "bia@exemplo.com", emailVerified: true, createdAt: "" },
}

const PLATFORM = { slug: "loja" }
const OWN = { slug: "loja", ownDomain: true }

/** Every `Set-Cookie` of an answer for one name, as `[value, path]`. */
function written(answer: NextResponse, name: string): [string, string][] {
  return answer.headers
    .getSetCookie()
    .filter((cookie) => cookie.startsWith(`${name}=`))
    .map((cookie) => [cookie.slice(name.length + 1).split(";")[0] ?? "", /;\s*path=([^;]*)/i.exec(cookie)?.[1] ?? ""])
}

describe("a shopper's session cookies", () => {
  describe("at the platform's host", () => {
    it("live on the shop's path, httpOnly, and nothing else is written", () => {
      const answer = NextResponse.next()
      setCustomerSessionCookies(answer, PLATFORM, SESSION)

      expect(answer.cookies.get("bl_shopper_access")).toMatchObject({ value: "shopper-access", path: "/loja", httpOnly: true, sameSite: "lax" })
      expect(answer.cookies.get("bl_shopper_refresh")).toMatchObject({ value: "shopper-refresh", path: "/loja", httpOnly: true })
      expect(answer.headers.getSetCookie()).toHaveLength(2)
    })

    it("are cleared on that same path", () => {
      const answer = NextResponse.next()
      clearCustomerSessionCookies(answer, PLATFORM)

      expect(written(answer, "bl_shopper_access")).toEqual([["", "/loja"]])
      expect(written(answer, "bl_shopper_refresh")).toEqual([["", "/loja"]])
    })
  })

  describe("at the shop's own domain (BEELINK-283)", () => {
    /** The shop's pages sit at `/conta` there: a cookie on `/loja` is never sent to them. */
    it("live on the whole site", () => {
      const answer = NextResponse.next()
      setCustomerSessionCookies(answer, OWN, SESSION)

      expect(answer.cookies.get("bl_shopper_access")).toMatchObject({ value: "shopper-access", path: "/", httpOnly: true })
      expect(answer.cookies.get("bl_shopper_refresh")).toMatchObject({ value: "shopper-refresh", path: "/", httpOnly: true })
    })

    /**
     * A browser served that host under the slug, before the proxy learned of the domain, holds the
     * pair on `/loja` too — and both are sent to `/loja/api`. The twin is expired with every write.
     */
    it("expire the same two cookies on the shop's slug, as headers the jar cannot hold", () => {
      const answer = NextResponse.next()
      setCustomerSessionCookies(answer, OWN, SESSION)

      expect(written(answer, "bl_shopper_access")).toEqual([["shopper-access", "/"], ["", "/loja"]])
      expect(written(answer, "bl_shopper_refresh")).toEqual([["shopper-refresh", "/"], ["", "/loja"]])
      const twins = answer.headers.getSetCookie().filter((cookie) => /path=\/loja/i.test(cookie))
      expect(twins).toHaveLength(2)
      for (const twin of twins) expect(twin).toMatch(/; Max-Age=0; HttpOnly; SameSite=Lax$/)
    })

    it("are cleared on both paths: signed out at the root, no twin goes on living under the slug", () => {
      const answer = NextResponse.next()
      clearCustomerSessionCookies(answer, OWN)

      expect(written(answer, "bl_shopper_access")).toEqual([["", "/"], ["", "/loja"]])
      expect(written(answer, "bl_shopper_refresh")).toEqual([["", "/"], ["", "/loja"]])
    })

    /** Why the session is the last thing written on an answer: the jar rebuilds the headers from what it holds. */
    it("lose the twins' headers to a jar write made afterwards — and never the session itself", () => {
      const answer = NextResponse.next()
      setCustomerSessionCookies(answer, OWN, SESSION)
      answer.cookies.set("bl_other", "1")

      expect(written(answer, "bl_shopper_access")).toEqual([["shopper-access", "/"]])
      expect(written(answer, "bl_shopper_refresh")).toEqual([["shopper-refresh", "/"]])
    })
  })
})
