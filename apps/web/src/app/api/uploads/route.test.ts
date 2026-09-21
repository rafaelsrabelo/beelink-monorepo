// Libs
import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"

// App
import { POST } from "./route"

function request(init: { cookie?: string; origin?: string } = {}): NextRequest {
  const body = new FormData()
  body.append("file", new File(["bytes"], "logo.png", { type: "image/png" }))

  return new NextRequest("http://localhost:3000/api/uploads", {
    method: "POST",
    headers: new Headers({
      origin: init.origin ?? "http://localhost:3000",
      cookie: init.cookie ?? "bl_access=access-token",
    }),
    body,
  })
}

describe("POST /api/uploads", () => {
  it("refuses with a code the panel can explain, rather than a generic failure", async () => {
    const response = POST(request())

    expect(response.status).toBe(501)
    expect(await response.json()).toMatchObject({ errorCode: "UPLOAD_NOT_CONFIGURED" })
  })

  it("already requires a session, so the storage adapter does not inherit an open drop box", async () => {
    const response = POST(request({ cookie: "" }))

    expect(response.status).toBe(401)
  })

  it("refuses a post from another origin before it reads anything", async () => {
    const response = POST(request({ origin: "http://evil.test" }))

    expect(response.status).toBe(403)
  })
})
