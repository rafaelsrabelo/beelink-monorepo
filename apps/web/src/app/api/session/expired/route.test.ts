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
})
