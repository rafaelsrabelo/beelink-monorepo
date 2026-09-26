// Libs
import { describe, expect, it } from "vitest"

// App
import { readsCatalog, resolvedOnServer, unavailableKindsOf } from "./design-kinds"

describe("unavailableKindsOf", () => {
  it("keeps a site from selling and a store from taking leads by form", () => {
    expect(unavailableKindsOf("INSTITUTIONAL", false)).toEqual(["PRODUCTS", "CATEGORIES", "FEATURED_PRODUCT"])
    expect(unavailableKindsOf("ECOMMERCE", false)).toEqual(["CONTACT"])
  })

  it("keeps the strip off a landing, which draws the home's", () => {
    expect(unavailableKindsOf("ECOMMERCE", true)).toEqual(["CONTACT", "ANNOUNCEMENT"])
  })
})

describe("readsCatalog", () => {
  it("loads the categories and products for the kinds that point at them", () => {
    expect(readsCatalog("CALL_TO_ACTION")).toBe(true)
    expect(readsCatalog("BANNER")).toBe(true)
    expect(readsCatalog("FAQ")).toBe(false)
  })
})

describe("resolvedOnServer", () => {
  it("names the kinds whose drawing the page has to fetch again", () => {
    expect(resolvedOnServer("PRODUCTS")).toBe(true)
    expect(resolvedOnServer("FEATURED_PRODUCT")).toBe(true)
    expect(resolvedOnServer("BANNER")).toBe(false)
  })
})
