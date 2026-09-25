// Libs
import { afterEach, describe, expect, it, vi } from "vitest"

// The marker throws outside a React Server environment; a unit test is not one.
vi.mock("server-only", () => ({}))

async function demoWith(env: Record<string, string | undefined>) {
  vi.resetModules()
  vi.stubEnv("STOREFRONT_DEMO_REVIEWS", env.STOREFRONT_DEMO_REVIEWS as string)
  vi.stubEnv("STOREFRONT_DEMO_SHOPS", env.STOREFRONT_DEMO_SHOPS as string)
  return import("./storefront-demo")
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("the example reviews", () => {
  it("answer nothing while the switch is off, whatever the shop", async () => {
    const demo = await demoWith({ STOREFRONT_DEMO_REVIEWS: undefined, STOREFRONT_DEMO_SHOPS: "loja-do-design" })

    expect(demo.demoReviewsEnabledFor("loja-do-design")).toBe(false)
    expect(demo.demoRatingsFor("loja-do-design", ["p1"])).toEqual({})
    expect(demo.demoReviewsOf("loja-do-design", { id: "p1", options: [] })).toBeNull()
  })

  it("answer only for the shops named, even with the switch on", async () => {
    const demo = await demoWith({ STOREFRONT_DEMO_REVIEWS: "true", STOREFRONT_DEMO_SHOPS: "loja-do-design, outra" })

    expect(demo.demoReviewsEnabledFor("loja-do-design")).toBe(true)
    expect(demo.demoReviewsEnabledFor("outra")).toBe(true)
    expect(demo.demoReviewsEnabledFor("mutante-performance")).toBe(false)
    expect(demo.demoRatingsFor("mutante-performance", ["p1"])).toEqual({})
  })

  it("give one product the same numbers every time, and two products different ones", async () => {
    const demo = await demoWith({ STOREFRONT_DEMO_REVIEWS: "1", STOREFRONT_DEMO_SHOPS: "loja-do-design" })

    const first = demo.demoRatingOf("01a0d395-c1ab-7399-a472-84a307bf060d")
    expect(demo.demoRatingOf("01a0d395-c1ab-7399-a472-84a307bf060d")).toEqual(first)
    expect(first.average).toBeGreaterThanOrEqual(3.8)
    expect(first.average).toBeLessThanOrEqual(5)
    expect(demo.demoRatingOf("outro")).not.toEqual(first)
  })

  it("name the product's own options in a review, and say the histogram adds up", async () => {
    const demo = await demoWith({ STOREFRONT_DEMO_REVIEWS: "true", STOREFRONT_DEMO_SHOPS: "loja-do-design" })
    const reviews = demo.demoReviewsOf("loja-do-design", {
      id: "p1",
      options: [
        { id: "o1", name: "Sabor", values: [{ id: "v1", name: "Chocolate", colorHex: null }] },
        { id: "o2", name: "Peso", values: [{ id: "v2", name: "900g", colorHex: null }] },
      ],
    })!

    expect(reviews.reviews[0]?.variantLabel).toBe("Sabor: Chocolate · Peso: 900g")
    expect(reviews.histogram.reduce((sum, row) => sum + row.percent, 0)).toBe(100)
    expect(reviews.reviews.every((review) => /exemplo/i.test(review.title) || /exemplo/i.test(review.body))).toBe(true)
  })
})
