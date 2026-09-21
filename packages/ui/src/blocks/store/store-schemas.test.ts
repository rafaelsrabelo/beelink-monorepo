// Libs
import { describe, expect, it } from "vitest"

// Locales
import { ptBR } from "../../locales/pt-BR"

// Block
import {
  createStoreCreateSchema,
  createStoreIdentitySchema,
  createStoreSettingsSchema,
} from "./store-schemas"
import { sampleStoreCreateValues, sampleStoreSettingsValues } from "./store.fixtures"

const identity = createStoreIdentitySchema(ptBR.validation)
const create = createStoreCreateSchema(ptBR.validation)
const settings = createStoreSettingsSchema(ptBR.validation)

const sampleIdentity = sampleStoreSettingsValues.identity

describe("the shop description bound", () => {
  /**
   * The number that stopped a carried-over shop from saving. `PublicStore.description` states 2000,
   * the API's DTOs enforce 2000, and the legacy column is an unbounded `text` — so a lower cap here
   * refuses a description the shop has already saved, on a field the shopkeeper never touched.
   */
  it("accepts the 2000 characters the API accepts", () => {
    const result = identity.safeParse({ ...sampleIdentity, description: "a".repeat(2000) })

    expect(result.success).toBe(true)
  })

  it("refuses 2001, and says the same number the API would", () => {
    const result = identity.safeParse({ ...sampleIdentity, description: "a".repeat(2001) })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe(ptBR.validation.storeDescriptionMax)
    expect(ptBR.validation.storeDescriptionMax).toContain("2000")
  })
})

describe("createStoreCreateSchema", () => {
  const filled = {
    ...sampleStoreCreateValues,
    slug: "doces-da-ana",
    identity: { ...sampleStoreCreateValues.identity, name: "Doces da Ana" },
    social: { ...sampleStoreCreateValues.social, whatsapp: "11999998888" },
  }

  it("accepts a shop with only what the API asks for", () => {
    expect(create.safeParse(filled).success).toBe(true)
  })

  it("refuses an address that is not a slug, which is the one field set exactly once", () => {
    for (const slug of ["Doces da Ana", "doces_da_ana", "-doces", "doces--da-ana", "ab"]) {
      expect(create.safeParse({ ...filled, slug }).success).toBe(false)
    }
  })

  it("refuses a shop with no WhatsApp, because an order has nowhere to arrive", () => {
    const result = create.safeParse({ ...filled, social: { ...filled.social, whatsapp: "" } })

    expect(result.success).toBe(false)
  })

  it("leaves the address blank-able: a shop can open before it registers where it is", () => {
    expect(create.safeParse({ ...filled, address: sampleStoreCreateValues.address }).success).toBe(
      true,
    )
  })
})

describe("createStoreSettingsSchema", () => {
  it("refuses a shop that would take no payment at all", () => {
    const result = settings.safeParse({ ...sampleStoreSettingsValues, paymentMethods: [] })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe(ptBR.validation.paymentMethodsMin)
  })

  it("refuses a colour that is not six hexadecimal digits, the only shape the storefront paints", () => {
    const appearance = sampleStoreSettingsValues.appearance
    const result = settings.safeParse({
      ...sampleStoreSettingsValues,
      appearance: { ...appearance, colors: { ...appearance.colors, primary: "azul" } },
    })

    expect(result.success).toBe(false)
  })

  it("carries the product card style, so the panel's control is not dropped on save", () => {
    const appearance = sampleStoreSettingsValues.appearance
    const result = settings.safeParse({
      ...sampleStoreSettingsValues,
      appearance: { ...appearance, cardLayout: "horizontal" },
    })

    expect(result.success).toBe(true)
    expect(result.data?.appearance.cardLayout).toBe("horizontal")
  })
})
