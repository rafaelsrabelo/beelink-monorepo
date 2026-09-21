// Libs
import { describe, expect, it } from "vitest"

// Types
import type { Store } from "@harness-monorepo/contracts"

// App
import { toCreatePayload, toSettingsValues, toUpdatePayload } from "./store-payloads"

const STORE: Store = {
  id: "01931f2e-1111-7000-8000-000000000001",
  ownerId: "01931f2e-0000-7000-8000-000000000009",
  slug: "doces-da-ana",
  name: "Doces da Ana",
  description: null,
  type: "ECOMMERCE",
  logoUrl: null,
  bannerImageUrl: null,
  layoutType: "DEFAULT",
  showProductsByCategory: false,
  colors: { background: "", primary: "", text: "", header: "" },
  socialNetworks: { whatsapp: null, instagram: null, tiktok: null, spotify: null, youtube: null },
  layoutSettings: { showBanner: true, productsPerRow: 3 },
  paymentMethods: ["MONEY", "PIX"],
  address: {
    street: null,
    number: null,
    complement: null,
    neighborhood: null,
    city: null,
    state: null,
    zipCode: null,
  },
  latitude: null,
  longitude: null,
  category: null,
  createdAt: "2026-09-20T12:00:00.000Z",
  updatedAt: "2026-09-20T12:00:00.000Z",
}

describe("toSettingsValues", () => {
  it("turns every absent field into the empty string the inputs hold", () => {
    const values = toSettingsValues(STORE)

    expect(values.identity.description).toBe("")
    expect(values.identity.categoryId).toBe("")
    expect(values.social.whatsapp).toBe("")
    expect(values.address.city).toBe("")
  })

  it("lifts cardLayout out of the layout blob, and falls back for a row carried over without it", () => {
    expect(toSettingsValues(STORE).appearance.cardLayout).toBe("grid")

    const horizontal = { ...STORE, layoutSettings: { ...STORE.layoutSettings, cardLayout: "horizontal" as const } }

    expect(toSettingsValues(horizontal).appearance.cardLayout).toBe("horizontal")
  })
})

describe("toUpdatePayload", () => {
  const values = toSettingsValues(STORE)

  it("sends back the layout switches no tab edits, so a replacement cannot clear them", () => {
    expect(toUpdatePayload(STORE, values).layoutSettings).toMatchObject(STORE.layoutSettings)
  })

  it("merges the one layout key the appearance tab owns over the echo, dropping none of the rest", () => {
    const payload = toUpdatePayload(STORE, {
      ...values,
      appearance: { ...values.appearance, cardLayout: "horizontal" },
    })

    expect(payload.layoutSettings).toEqual({
      showBanner: true,
      productsPerRow: 3,
      cardLayout: "horizontal",
    })
  })

  it("strips the masks the fields accept and upper-cases the UF", () => {
    const payload = toUpdatePayload(STORE, {
      ...values,
      address: { ...values.address, zipCode: "12345-678", state: "sp", city: " São Paulo " },
      social: { ...values.social, whatsapp: "(11) 99999-8888" },
    })

    expect(payload.address?.zipCode).toBe("12345678")
    expect(payload.address?.state).toBe("SP")
    expect(payload.address?.city).toBe("São Paulo")
    expect(payload.socialNetworks.whatsapp).toBe("11999998888")
  })

  it("stores a handle without the `@` a reader may have typed, and a blank one as absent", () => {
    const payload = toUpdatePayload(STORE, {
      ...values,
      social: { ...values.social, whatsapp: "11999998888", instagram: "@docesdaana", tiktok: "  " },
    })

    expect(payload.socialNetworks.instagram).toBe("docesdaana")
    expect(payload.socialNetworks.tiktok).toBeNull()
  })
})

describe("toCreatePayload", () => {
  const values = toSettingsValues(STORE)

  it("carries the address and the handles the legacy wizard collected and then dropped", () => {
    const payload = toCreatePayload({
      slug: "doces-da-ana",
      identity: values.identity,
      social: { ...values.social, whatsapp: "(11) 99999-8888" },
      address: { ...values.address, city: "São Paulo", state: "sp" },
    })

    expect(payload.socialNetworks.whatsapp).toBe("11999998888")
    expect(payload.address).toMatchObject({ city: "São Paulo", state: "SP" })
  })

  it("leaves colours out, which the contract reads as the platform's own theme", () => {
    const payload = toCreatePayload({
      slug: "doces-da-ana",
      identity: values.identity,
      social: values.social,
      address: values.address,
    })

    expect(payload).not.toHaveProperty("colors")
  })

  it("carries the palette the appearance tab opened on, when the form had one to send", () => {
    // Taken from the fixture rather than written out: a palette is four hex literals, and
    // `web/no-hex-colors` scans this tree with no exemption for a test file.
    const colors = values.appearance.colors
    const payload = toCreatePayload({
      slug: "doces-da-ana",
      identity: values.identity,
      social: values.social,
      address: values.address,
      colors,
    })

    expect(payload.colors).toEqual(colors)
  })

  it("strips the same masks the update path strips, so both verbs store one shape", () => {
    const payload = toCreatePayload({
      slug: "doces-da-ana",
      identity: { ...values.identity, description: "  " },
      social: { ...values.social, whatsapp: "(11) 99999-8888", instagram: "@docesdaana" },
      address: { ...values.address, zipCode: "12345-678", state: "sp" },
    })

    expect(payload.description).toBeNull()
    expect(payload.socialNetworks.whatsapp).toBe("11999998888")
    expect(payload.socialNetworks.instagram).toBe("docesdaana")
    expect(payload.address?.zipCode).toBe("12345678")
    expect(payload.address?.state).toBe("SP")
  })
})
