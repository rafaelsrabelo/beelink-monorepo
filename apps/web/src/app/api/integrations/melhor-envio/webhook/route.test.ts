// Libs
import { afterEach, describe, expect, it, vi } from "vitest"

// Next
import { NextRequest } from "next/server"

const callApi = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api", () => ({ callApi }))

// App
import { POST } from "./route"

afterEach(() => callApi.mockReset())

const body = '{"event":"order.posted","data":{"id":"abc","status":"posted"}}'

describe("Melhor Envio's webhook through the web (BEELINK-188)", () => {
  it("hands the body over as it arrived, with the signature beside it, and answers what the API answers", async () => {
    callApi.mockResolvedValue(Response.json({ result: "APPLIED" }))

    const response = await POST(new NextRequest("https://link.beecoders.net/api/integrations/melhor-envio/webhook", { method: "POST", body, headers: { "content-type": "application/json", "x-me-signature": "c2lnbmVk" } }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ result: "APPLIED" })
    const call = callApi.mock.calls[0]![0] as { path: string; headers: Record<string, string>; rawBody: { stream: ReadableStream<Uint8Array>; contentType: string } }
    expect(call.path).toBe("/integrations/melhor-envio/webhook")
    expect(call.headers).toEqual({ "x-me-signature": "c2lnbmVk" })
    expect(await new Response(call.rawBody.stream).text()).toBe(body)
  })

  it("passes the API's refusal on, and says when the API could not be reached", async () => {
    callApi.mockResolvedValueOnce(Response.json({ statusCode: 401, errorCode: "INTEGRATION_SIGNATURE_INVALID" }, { status: 401 }))
    expect((await POST(new NextRequest("https://link.beecoders.net/api/integrations/melhor-envio/webhook", { method: "POST", body }))).status).toBe(401)

    callApi.mockRejectedValueOnce(new Error("down"))
    expect((await POST(new NextRequest("https://link.beecoders.net/api/integrations/melhor-envio/webhook", { method: "POST", body }))).status).toBe(502)
  })
})
