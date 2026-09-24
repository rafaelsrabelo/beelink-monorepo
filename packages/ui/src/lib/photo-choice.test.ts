// Libs
import { describe, expect, it } from "vitest"

// UI
import { optionOfValue, photosOf } from "./photo-choice"

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
