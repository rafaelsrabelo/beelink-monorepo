// Libs
import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"

// App
import { GET } from "./route"

describe("GET /api/session/expired", () => {
  it("clears both cookies and sends the person to sign in again", () => {
    const response = GET(new NextRequest("http://localhost:3000/api/session/expired"))

    expect(response.headers.get("location")).toBe("http://localhost:3000/login")
    expect(response.cookies.get("bl_access")?.value).toBe("")
    expect(response.cookies.get("bl_refresh")?.value).toBe("")
  })

  it("keeps the page to come back to, and only a page of the panel", () => {
    const back = GET(new NextRequest("http://localhost:3000/api/session/expired?voltar=%2Fadmin%2Floja%2Forders"))
    expect(back.headers.get("location")).toBe("http://localhost:3000/login?voltar=%2Fadmin%2Floja%2Forders")

    const elsewhere = GET(new NextRequest("http://localhost:3000/api/session/expired?voltar=https%3A%2F%2Fevil.example"))
    expect(elsewhere.headers.get("location")).toBe("http://localhost:3000/login")
  })

  it("sends the person to the site they are on, not to the address the server binds behind the proxy", () => {
    const response = GET(
      new NextRequest("https://0.0.0.0:3000/api/session/expired", { headers: { "x-forwarded-host": "link.beecoders.net" } }),
    )

    expect(response.headers.get("location")).toBe("https://link.beecoders.net/login")
  })
})
