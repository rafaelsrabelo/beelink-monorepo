// Libs
import { describe, expect, it } from "vitest"

// Types
import type { Store } from "@harness-monorepo/contracts"

// App
import { toCreatePayload, toSettingsValues, toUpdatePayload } from "./store-payloads"

const STORE: Store = {
  id: "01931f2e-1111-7000-8000-000000000001",
  ownerId: "01931f2e-0000-7000-8000-000000000009",
  inactiveAfterDays: 45,
  slug: "doces-da-ana",
  routeWords: { products: "produtos", categories: "categorias", search: "busca", cart: "carrinho", signIn: "entrar", verifyEmail: "confirmar-email", resetPassword: "nova-senha", account: "conta", accountTabs: { orders: "pedidos", favorites: "favoritos", reviews: "avaliacoes", cashback: "cashback", profile: "perfil", messages: "conversas" } },
  name: "Doces da Ana",
  description: null,
  type: "ECOMMERCE",
  logoUrl: null,
  faviconUrl: null,
  bannerImageUrl: null,
  sections: [],
  layoutType: "DEFAULT",
  colors: { background: "", primary: "", header: "", footer: "" },
  socialNetworks: { whatsapp: null, instagram: null, tiktok: null, spotify: null, youtube: null },
  layoutSettings: { showBanner: true, productsPerRow: 3 },
  paymentMethods: ["MONEY", "PIX"],
  cashback: null,
  metaPixelId: null,
  googleAnalyticsId: null,
  customDomain: null,
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
  /**
   * The round trip that matters: a shop saved with eleven digits comes back with thirteen, because
   * the DTO puts the country code on. Handing those thirteen to the field shows the shopkeeper a
   * number they never typed, and the mask gives up past eleven digits — so the panel would display
   * 5585994100683 in a field whose placeholder promises (85) 99410-0683.
   */
  it.each([
    ["5585994100683", "85994100683"],
    ["558533334444", "8533334444"],
    // Not a Brazilian number at that length: handed back as it was stored rather than guessed at.
    ["12025550123", "12025550123"],
    ["5511", "5511"],
    ["", ""],
  ])("hands back %s as %s", (stored, shown) => {
    const values = toSettingsValues({
      ...STORE,
      socialNetworks: { ...STORE.socialNetworks, whatsapp: stored },
    })

    expect(values.social.whatsapp).toBe(shown)
  })

  it("turns every absent field into the empty string the inputs hold", () => {
    const values = toSettingsValues(STORE)

    expect(values.identity.description).toBe("")
    expect(values.identity.faviconUrl).toBe("")
    expect(values.identity.categoryId).toBe("")
    expect(values.social.whatsapp).toBe("")
    expect(values.address.city).toBe("")
  })
})

describe("toUpdatePayload", () => {
  const values = toSettingsValues(STORE)

  it("reads and sends back after how many days a customer turns inactive", () => {
    expect(values.customers).toEqual({ inactiveAfterDays: 45 })
    expect(toUpdatePayload(STORE, { ...values, customers: { inactiveAfterDays: 90 } }).inactiveAfterDays).toBe(90)
  })

  // A PUT replaces: the icon is sent with every save, or the save of another tab would clear it.
  it("shows the shop's browser icon and sends it back, and sends none once it was removed (BEELINK-312)", () => {
    const withIcon = { ...STORE, faviconUrl: "https://cdn.exemplo.com/icone.png" }
    const shown = toSettingsValues(withIcon)

    expect(shown.identity.faviconUrl).toBe("https://cdn.exemplo.com/icone.png")
    expect(toUpdatePayload(withIcon, shown).faviconUrl).toBe("https://cdn.exemplo.com/icone.png")
    expect(toUpdatePayload(withIcon, { ...shown, identity: { ...shown.identity, faviconUrl: "" } }).faviconUrl).toBeNull()
    expect(toUpdatePayload(STORE, values).faviconUrl).toBeNull()
  })

  it("sends back the layout switches no tab edits, so a replacement cannot clear them", () => {
    expect(toUpdatePayload(STORE, values).layoutSettings).toMatchObject(STORE.layoutSettings)
  })

  it("echoes the look of the shop as it was read: design mode edits it, not a tab here", () => {
    const payload = toUpdatePayload(STORE, values)

    expect(payload).toMatchObject({ layoutType: STORE.layoutType, bannerImageUrl: STORE.bannerImageUrl, colors: STORE.colors })
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
    const colors = STORE.colors
    const payload = toCreatePayload({
      slug: "doces-da-ana",
      identity: values.identity,
      social: values.social,
      address: values.address,
      colors,
    })

    expect(payload.colors).toEqual(colors)
  })

  // No model picked is no `template` key at all: the API then opens the page every shop always got.
  it("sends a shop that picked no model exactly what it sent before there were models", () => {
    const input = { slug: "doces-da-ana", identity: values.identity, social: values.social, address: values.address }

    const untouched = toCreatePayload(input)
    const folded = toCreatePayload({ ...input, homeTemplate: "" })

    expect(untouched).not.toHaveProperty("template")
    expect(folded).toEqual(untouched)
    expect(Object.keys(untouched).sort()).toEqual(["address", "categoryId", "description", "logoUrl", "name", "slug", "socialNetworks", "type"])
    // The browser icon is the settings' to choose (BEELINK-312): a new shop is sent without one.
    expect(untouched).not.toHaveProperty("faviconUrl")
  })

  it("sends the home model a shop picked, and none it does not know", () => {
    const input = { slug: "doces-da-ana", identity: values.identity, social: values.social, address: values.address }

    expect(toCreatePayload({ ...input, homeTemplate: "por-categorias" }).template).toBe("por-categorias")
    expect(toCreatePayload({ ...input, homeTemplate: "lancamento" })).not.toHaveProperty("template")
    expect(toCreatePayload({ ...input, homeTemplate: "servicos-b2b" })).not.toHaveProperty("template")
  })

  it("opens a site from its own model, whatever was picked while it was still a shop", () => {
    const site = { ...values.identity, type: "INSTITUTIONAL" as const }
    const input = { slug: "asfalto-norte", identity: site, social: values.social, address: values.address }

    expect(toCreatePayload(input).template).toBe("servicos-b2b")
    expect(toCreatePayload({ ...input, homeTemplate: "ofertas" }).template).toBe("servicos-b2b")
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
