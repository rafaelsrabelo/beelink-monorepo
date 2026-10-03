// Libs
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { AuthRequestError, forgotPassword, resendVerification, signIn, signOut } from "./auth-requests"

function answerWith(status: number, body?: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      body === undefined
        ? new Response(null, { status })
        : new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }),
    ),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("auth requests", () => {
  it("talks to this app's own route handler, never to the API", async () => {
    answerWith(200, { id: "1", name: "Ana", email: "ana@exemplo.com", emailVerified: true, createdAt: "" })

    await signIn({ email: "ana@exemplo.com", password: "uma-senha-comprida" })

    expect(fetch).toHaveBeenCalledWith("/api/session", expect.objectContaining({ method: "POST" }))
  })

  it("throws the API's code, not a sentence", async () => {
    answerWith(401, { statusCode: 401, errorCode: "AUTH_INVALID_CREDENTIALS", message: "whatever" })

    await expect(signIn({ email: "ana@exemplo.com", password: "errada" })).rejects.toMatchObject({
      errorCode: "AUTH_INVALID_CREDENTIALS",
    })
  })

  it("falls back to UNKNOWN when the answer carries no code", async () => {
    answerWith(500, "<html>gateway</html>")

    await expect(signIn({ email: "ana@exemplo.com", password: "x" })).rejects.toBeInstanceOf(AuthRequestError)
  })

  it("signs out through the same handler, with no body to parse", async () => {
    answerWith(204)

    await expect(signOut()).resolves.toBeUndefined()
    expect(fetch).toHaveBeenCalledWith("/api/session", expect.objectContaining({ method: "DELETE" }))
  })

  it("takes the 202 with no body the e-mailing calls answer as the success it is", async () => {
    answerWith(202)
    await expect(forgotPassword("ana@exemplo.com")).resolves.toBeUndefined()

    answerWith(202)
    await expect(resendVerification("ana@exemplo.com")).resolves.toBeUndefined()
  })
})
