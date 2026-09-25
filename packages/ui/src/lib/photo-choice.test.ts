// Libs
import { describe, expect, it } from "vitest"

// UI
import { optionOfValue, photosOf, valuePhotoOf } from "./photo-choice"

const options = [
  { id: "peso", values: [{ id: "900" }, { id: "750" }] },
  { id: "sabor", values: [{ id: "choc" }, { id: "mor" }, { id: "baun" }] },
]
const optionOf = optionOfValue(options, (option) => option.values, (entry) => entry.id)

const geral = { url: "geral", optionValueIds: [] }
const morango = { url: "morango", optionValueIds: ["mor"] }
const morango900 = { url: "morango-900", optionValueIds: ["mor", "900"] }
const chocOuBaun = { url: "choc-ou-baun", optionValueIds: ["choc", "baun"] }
const gallery = [geral, morango, morango900, chocOuBaun]

const urls = (photos: readonly { url: string }[]) => photos.map((photo) => photo.url)

describe("the photos a combination shows", () => {
  it("leads with the most specific, then the flavour's, then the ones of every combination", () => {
    expect(urls(photosOf(gallery, optionOf, ["900", "mor"]))).toEqual(["morango-900", "morango", "geral"])
  })

  it("leaves out a photo of the same flavour in another weight", () => {
    expect(urls(photosOf(gallery, optionOf, ["750", "mor"]))).toEqual(["morango", "geral"])
  })

  it("widens within an option: a photo of Chocolate or Baunilha is of both", () => {
    expect(urls(photosOf(gallery, optionOf, ["750", "baun"]))).toEqual(["choc-ou-baun", "geral"])
    expect(urls(photosOf(gallery, optionOf, ["900", "choc"]))).toEqual(["choc-ou-baun", "geral"])
  })

  it("keeps the shopkeeper's order among photos equally specific", () => {
    const second = { url: "morango-2", optionValueIds: ["mor"] }
    expect(urls(photosOf([second, geral, morango], optionOf, ["900", "mor"]))).toEqual(["morango-2", "morango", "geral"])
  })

  it("shows the whole gallery when no photo is of the combination", () => {
    expect(urls(photosOf([morango, morango900], optionOf, ["900", "choc"]))).toEqual(["morango", "morango-900"])
  })

  it("reads a value the product no longer has as naming nothing", () => {
    expect(urls(photosOf([{ url: "antiga", optionValueIds: ["gone"] }, morango], optionOf, ["900", "choc"]))).toEqual(["antiga"])
  })

  it("takes a photo with no values at all as one of every combination", () => {
    const unmarked: { url: string; optionValueIds?: string[] } = { url: "sem-marca" }
    expect(urls(photosOf([unmarked], optionOf, ["750", "choc"]))).toEqual(["sem-marca"])
  })
})

describe("valuePhotoOf", () => {
  const flavours = ["uva", "limao", "morango"]

  it("finds the first photo tagged with a value, and none for a value no photo names", () => {
    const photos = [{ url: "all.jpg" }, { url: "uva.jpg", optionValueIds: ["uva"] }, { url: "uva-2.jpg", optionValueIds: ["uva"] }]

    expect(valuePhotoOf(photos, "uva", flavours)?.url).toBe("uva.jpg")
    expect(valuePhotoOf(photos, "limao", flavours)).toBeUndefined()
  })

  it("skips a photo that also names another option's value, for either of them", () => {
    const photos = [{ url: "uva-300.jpg", optionValueIds: ["uva", "300g"] }, { url: "uva.jpg", optionValueIds: ["uva"] }]

    expect(valuePhotoOf(photos, "uva", flavours)?.url).toBe("uva.jpg")
    expect(valuePhotoOf(photos, "300g", ["150g", "300g"])).toBeUndefined()
  })

  it("keeps a photo tagged with two values of the same option, for each of them", () => {
    const photos = [{ url: "uva-ou-limao.jpg", optionValueIds: ["uva", "limao"] }]

    expect(valuePhotoOf(photos, "limao", flavours)?.url).toBe("uva-ou-limao.jpg")
  })
})
