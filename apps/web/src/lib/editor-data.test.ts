// Libs
import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ callApi: vi.fn() }))

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "token" }) }) }))
vi.mock("./api", () => ({ callApi: mocks.callApi }))

import { pagePreviewAt, PREVIEW_LOCKED } from "./editor-data"

describe("the owner's preview of a page, for design mode", () => {
  it("is the draft the API answers", async () => {
    mocks.callApi.mockResolvedValue(Response.json({ page: { id: "home-id", kind: "HOME" }, sections: [] }))

    expect(await pagePreviewAt("loja-amora", "home")).toEqual({ page: { id: "home-id", kind: "HOME" }, sections: [] })
  })

  it("says a page locked for want of payment apart from one that is not there (BEELINK-296)", async () => {
    mocks.callApi.mockResolvedValue(Response.json({ statusCode: 403, errorCode: "PAGE_LOCKED", message: "", details: { reason: "TRIAL_EXPIRED" } }, { status: 403 }))
    expect(await pagePreviewAt("loja-amora", "home")).toBe(PREVIEW_LOCKED)

    mocks.callApi.mockResolvedValue(Response.json({ statusCode: 404, errorCode: "PAGE_NOT_FOUND", message: "" }, { status: 404 }))
    expect(await pagePreviewAt("loja-amora", "outra")).toBeNull()

    mocks.callApi.mockResolvedValue(new Response("upstream down", { status: 502 }))
    expect(await pagePreviewAt("loja-amora", "home")).toBeNull()

    mocks.callApi.mockImplementation(async () => {
      throw new Error("ECONNREFUSED")
    })
    expect(await pagePreviewAt("loja-amora", "home")).toBeNull()
  })
})
