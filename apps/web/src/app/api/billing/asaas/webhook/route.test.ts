// Libs
import { afterEach, describe, expect, it, vi } from "vitest"

// Next
import { NextRequest } from "next/server"

const callApi = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api", () => ({ callApi }))

// App
import { POST } from "./route"

afterEach(() => callApi.mockReset())

const URL = "https://beelink.biz/api/billing/asaas/webhook"
const TOKEN = "the-token-asaas-sends-back-for-bee-links-own-account"
// Spaced and ordered as no serializer here would write it: the bytes must go on untouched.
const body = '{"id":"evt_05b708f961d739ea7eba7e4db318f621&368604920",  "event":"PAYMENT_RECEIVED","payment":{"id":"pay_080225913252","externalReference":"beelink-subscription-0199a0f1-0000-7000-8000-0000000000c1"}}'

describe("bee-link's own Asaas webhook through the web (BEELINK-221)", () => {
  it("hands the body over as it arrived, with the token beside it and nothing else of the request, and answers what the API answers", async () => {
    callApi.mockResolvedValue(Response.json({ result: "RECORDED" }))

    const response = await POST(new NextRequest(URL, { method: "POST", body, headers: { "content-type": "application/json", "asaas-access-token": TOKEN, cookie: "bl_access=abc", "user-agent": "Asaas" } }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ result: "RECORDED" })
    const call = callApi.mock.calls[0]![0] as { path: string; headers: Record<string, string>; rawBody: { stream: ReadableStream<Uint8Array>; contentType: string } }
    expect(call.path).toBe("/billing/asaas/webhook")
    expect(call.headers).toEqual({ "asaas-access-token": TOKEN })
    expect(call.rawBody.contentType).toBe("application/json")
    expect(await new Response(call.rawBody.stream).text()).toBe(body)
  })

  it("passes the API's refusal on — a request with no token is the API's to refuse — and says when the API could not be reached", async () => {
    callApi.mockResolvedValueOnce(Response.json({ statusCode: 401, errorCode: "BILLING_WEBHOOK_TOKEN_INVALID" }, { status: 401 }))
    const refused = await POST(new NextRequest(URL, { method: "POST", body }))
    expect(refused.status).toBe(401)
    expect(await refused.json()).toMatchObject({ errorCode: "BILLING_WEBHOOK_TOKEN_INVALID" })
    expect((callApi.mock.calls[0]![0] as { headers: Record<string, string> }).headers).toEqual({})

    callApi.mockRejectedValueOnce(new Error("down"))
    expect((await POST(new NextRequest(URL, { method: "POST", body, headers: { "asaas-access-token": TOKEN } }))).status).toBe(502)
  })

  it("answers an API answer that is not JSON with the API's own status", async () => {
    callApi.mockResolvedValueOnce(new Response("oops", { status: 500 }))
    expect((await POST(new NextRequest(URL, { method: "POST", body, headers: { "asaas-access-token": TOKEN } }))).status).toBe(500)
  })
})
