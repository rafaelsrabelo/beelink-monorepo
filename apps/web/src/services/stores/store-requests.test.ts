// Libs
import { afterEach, describe, expect, it, vi } from "vitest"

// Types
import type { UpdateStorePayload } from "@harness-monorepo/contracts"

// App
import {
  StoreRequestError,
  createStore,
  fetchMyStores,
  fetchStore,
  fetchStoreCategories,
  updateStore,
} from "./store-requests"

function answerWith(status: number, body: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }),
    ),
  )
}

const UPDATE = {
  name: "Doces da Ana",
  type: "ECOMMERCE",
  layoutType: "DEFAULT",
  showProductsByCategory: false,
  colors: { background: "", primary: "", header: "", footer: "" },
  socialNetworks: { whatsapp: "5511999998888" },
  paymentMethods: ["PIX"],
} satisfies UpdateStorePayload

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("store requests", () => {
  it("reads through this app's own route handler, never through the API", async () => {
    answerWith(200, [])

    await fetchMyStores()

    expect(fetch).toHaveBeenCalledWith("/api/stores", expect.objectContaining({ method: "GET" }))
  })

  it("says it speaks JSON on a bodyless read, so the BFF does not answer 415", async () => {
    answerWith(200, [])

    await fetchStoreCategories()

    expect(fetch).toHaveBeenCalledWith(
      "/api/store-categories",
      expect.objectContaining({ headers: { "content-type": "application/json" } }),
    )
  })

  it("escapes the slug it was given rather than pasting it into a path", async () => {
    answerWith(200, {})

    await fetchStore("doces da ana")

    expect(fetch).toHaveBeenCalledWith("/api/stores/doces%20da%20ana", expect.anything())
  })

  it("replaces the whole shop with PUT, which is what the panel's one save posts", async () => {
    answerWith(200, {})

    await updateStore("doces-da-ana", UPDATE)

    expect(fetch).toHaveBeenCalledWith(
      "/api/stores/doces-da-ana",
      expect.objectContaining({ method: "PUT", body: JSON.stringify(UPDATE) }),
    )
  })

  it("throws the API's code, not a sentence", async () => {
    answerWith(409, { statusCode: 409, errorCode: "STORE_SLUG_TAKEN", message: "whatever" })

    await expect(
      createStore({
        name: "Doces da Ana",
        slug: "doces-da-ana",
        type: "ECOMMERCE",
        socialNetworks: { whatsapp: "5511999998888" },
      }),
    ).rejects.toMatchObject({ errorCode: "STORE_SLUG_TAKEN" })
  })

  it("falls back to UNKNOWN when the answer carries no code", async () => {
    answerWith(502, "<html>gateway</html>")

    await expect(fetchStore("doces-da-ana")).rejects.toBeInstanceOf(StoreRequestError)
  })
})
