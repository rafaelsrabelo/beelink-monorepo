// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { GET } from "./route"

function request(cookie = "bl_access=access-token"): NextRequest {
  return new NextRequest("http://localhost:3000/api/cep/01001000", {
    method: "GET",
    headers: new Headers({ "content-type": "application/json", origin: "http://localhost:3000", cookie }),
  })
}

/** What Next hands a handler for `/api/cep/[zipCode]`, built by `next typegen`. */
function context(zipCode: string) {
  return { params: Promise.resolve({ zipCode }) }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("GET /api/cep/[zipCode]", () => {
  it("answers the four fields the address tab fills, from the digits it was given", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          cep: "01001-000",
          logradouro: "Praça da Sé",
          bairro: "Sé",
          localidade: "São Paulo",
          uf: "sp",
        }),
      ),
    )

    const response = await GET(request(), context("01001-000"))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      zipCode: "01001000",
      street: "Praça da Sé",
      neighborhood: "Sé",
      city: "São Paulo",
      state: "SP",
    })
  })

  it("reads ViaCEP's 200-with-`erro` as not found — the trap that filled the legacy form with undefined", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ erro: "true" })))

    const response = await GET(request(), context("99999999"))

    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({ errorCode: "CEP_NOT_FOUND" })
  })

  it("separates a postcode service that is down from a postcode that is wrong", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({}, { status: 500 })))

    const response = await GET(request(), context("01001000"))

    expect(response.status).toBe(502)
    expect(await response.json()).toMatchObject({ errorCode: "CEP_UNAVAILABLE" })
  })

  it("refuses anything that is not eight digits without reaching the third party at all", async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)

    const response = await GET(request(), context("123"))

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ errorCode: "CEP_INVALID" })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("is closed to a caller with no session, so it cannot be used as a free ViaCEP proxy", async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)

    const response = await GET(request(""), context("01001000"))

    expect(response.status).toBe(401)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
