// Libs
import { afterEach, describe, expect, it, vi } from "vitest"

// Types
import type { ProductDetail } from "@harness-monorepo/contracts"

// App
import { SaveProductError, saveProduct, type SaveProductVariables } from "./use-save-product"

const detail = { id: "p1", options: [], variants: [] } as unknown as ProductDetail

/** Every request the save makes, answered in order, and remembered as "METHOD path body". */
function answerInOrder(...answers: { status: number; body: unknown }[]): string[] {
  const calls: string[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method} ${url} ${init?.body ?? ""}`)
      const answer = answers.shift() ?? { status: 200, body: detail }
      return new Response(JSON.stringify(answer.body), {
        status: answer.status,
        headers: { "content-type": "application/json" },
      })
    }),
  )
  return calls
}

const base: SaveProductVariables = {
  productId: "p1",
  fields: { name: "Blusa" },
  perUnit: { priceCents: 18900 },
  hadOptions: false,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("saveProduct", () => {
  it("saves a product that sells one thing in one request, price included", async () => {
    const calls = answerInOrder()

    await saveProduct("lessari", { ...base, variations: { options: { options: [] }, variants: () => [], hasCombinations: false } })

    expect(calls).toHaveLength(1)
    expect(calls[0]).toContain("PUT /api/stores/lessari/products/p1 ")
    expect(calls[0]).toContain('"priceCents":18900')
  })

  it("gives a product its first options after its price, then prices each new combination", async () => {
    const calls = answerInOrder()
    const variants = vi.fn(() => [{ id: "v1", priceCents: 100 }])

    await saveProduct("lessari", {
      ...base,
      variations: { options: { options: [{ name: "Tamanho", values: [{ name: "P" }] }] }, variants, hasCombinations: true },
    })

    expect(calls.map((call) => call.split(" ").slice(0, 2).join(" "))).toEqual([
      "PUT /api/stores/lessari/products/p1",
      "PUT /api/stores/lessari/products/p1/options",
      "PUT /api/stores/lessari/products/p1/variants",
    ])
    expect(variants).toHaveBeenCalledWith(detail)
  })

  it("never sends a price with the product once it has options", async () => {
    const calls = answerInOrder()

    await saveProduct("lessari", {
      ...base,
      hadOptions: true,
      variations: { options: { options: [] }, variants: () => [], hasCombinations: true },
    })

    expect(calls[0]).not.toContain("priceCents")
  })

  it("puts the price back on the product when its last option goes", async () => {
    const calls = answerInOrder()

    await saveProduct("lessari", {
      ...base,
      hadOptions: true,
      variations: { options: { options: [] }, variants: () => [], hasCombinations: false },
    })

    expect(calls.map((call) => call.split(" ").slice(0, 2).join(" "))).toEqual([
      "PUT /api/stores/lessari/products/p1",
      "PUT /api/stores/lessari/products/p1/options",
      "PUT /api/stores/lessari/products/p1",
    ])
    expect(calls[2]).toContain('"priceCents":18900')
  })

  it("says which product exists when a later step of creating it is refused", async () => {
    answerInOrder(
      { status: 201, body: { ...detail, id: "new-id" } },
      { status: 400, body: { statusCode: 400, errorCode: "PRODUCT_OPTION_DUPLICATE", message: "x" } },
    )

    const saving = saveProduct("lessari", {
      ...base,
      productId: undefined,
      variations: { options: { options: [] }, variants: () => [], hasCombinations: true },
    })

    await expect(saving).rejects.toBeInstanceOf(SaveProductError)
    await expect(saving).rejects.toMatchObject({ productId: "new-id", errorCode: "PRODUCT_OPTION_DUPLICATE" })
  })
})
