// Libs
import { describe, expect, it } from "vitest"

// Types
import type { PublicProductDetail } from "@harness-monorepo/contracts"

// App
import { sharedAddressOf, sharedDescriptionOf, sharedPhotoOf, sharedVariantOf } from "./product-share"

const product = {
  id: "p1",
  slug: "whey",
  name: "Whey",
  images: [
    { id: "i1", url: "https://cdn/primeira.jpg", alt: null, optionValueIds: [] },
    { id: "i2", url: "https://cdn/uva.jpg", alt: null, optionValueIds: ["uva"] },
  ],
  options: [{ id: "sabor", name: "Sabor", values: [{ id: "uva", label: "Uva" }, { id: "morango", label: "Morango" }] }],
  variants: [
    { id: "v-uva", optionValueIds: ["uva"], imageUrl: null },
    { id: "v-morango", optionValueIds: ["morango"], imageUrl: "https://cdn/morango.jpg" },
  ],
} as unknown as PublicProductDetail

describe("sharedDescriptionOf", () => {
  it("is the words alone, with none of the marks they are stored with", () => {
    expect(sharedDescriptionOf("**Energia** para o _treino_.\n\n- Foco")).toBe("Energia para o treino. Foco")
  })

  // As the first shop's product is stored: its pasted heading lost the break after it.
  it("reads a heading stored against its paragraph as two words", () => {
    expect(sharedDescriptionOf("**Fogo Roxo**Mais energia, disposição e praticidade.")).toBe("Fogo Roxo Mais energia, disposição e praticidade.")
  })

  it("is cut on a word where a search result cuts, and says so", () => {
    const cut = sharedDescriptionOf(`${"palavra ".repeat(30)}fim`)

    expect(cut?.length).toBeLessThanOrEqual(161)
    expect(cut).toMatch(/palavra…$/)
  })

  it("is nothing for a product with no description, or one of marks alone", () => {
    expect(sharedDescriptionOf(null)).toBeUndefined()
    expect(sharedDescriptionOf("")).toBeUndefined()
    expect(sharedDescriptionOf("\n\n")).toBeUndefined()
  })
})

describe("sharedVariantOf", () => {
  it("is the combination the address asked for, when the product has it", () => {
    expect(sharedVariantOf(product, "v-uva")?.id).toBe("v-uva")
  })

  it("is none for one the product does not have, for none asked and for a key said twice", () => {
    expect(sharedVariantOf(product, "v-de-outro")).toBeNull()
    expect(sharedVariantOf(product, undefined)).toBeNull()
    expect(sharedVariantOf(product, ["v-uva", "v-morango"])).toBeNull()
  })
})

describe("sharedPhotoOf", () => {
  it("is the product's first photo with no combination chosen", () => {
    expect(sharedPhotoOf(product, null)).toBe("https://cdn/primeira.jpg")
  })

  it("is the combination's own photo, or the one tagged for it", () => {
    expect(sharedPhotoOf(product, sharedVariantOf(product, "v-morango"))).toBe("https://cdn/morango.jpg")
    expect(sharedPhotoOf(product, sharedVariantOf(product, "v-uva"))).toBe("https://cdn/uva.jpg")
  })

  it("is nothing for a product with no photo", () => {
    expect(sharedPhotoOf({ ...product, images: [] }, null)).toBeUndefined()
  })
})

describe("sharedAddressOf", () => {
  it("is the product's address, and keeps the combination the address chose", () => {
    expect(sharedAddressOf("/loja/produtos/whey", null)).toBe("/loja/produtos/whey")
    expect(sharedAddressOf("/loja/produtos/whey", sharedVariantOf(product, "v-uva"))).toBe("/loja/produtos/whey?variant=v-uva")
  })
})
