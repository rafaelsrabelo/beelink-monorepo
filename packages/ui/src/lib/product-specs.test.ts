// Libs
import { describe, expect, it } from "vitest"

// Lib
import { specRowsOf } from "./product-specs"

describe("specRowsOf", () => {
  it("names the category, then each option with every value it comes in", () => {
    const rows = specRowsOf(
      [
        { name: "Sabor", values: [{ name: "Frutas vermelhas" }, { name: "Limão" }] },
        { name: "Tamanho", values: [{ name: "150 g" }, { name: "300 g" }] },
      ],
      { name: "Pré-treino" },
      "Categoria",
    )

    expect(rows).toEqual([
      { label: "Categoria", value: "Pré-treino" },
      { label: "Sabor", value: "Frutas vermelhas, Limão" },
      { label: "Tamanho", value: "150 g, 300 g" },
    ])
  })

  it("leaves out an option with no values, and has no rows for a product with neither", () => {
    expect(specRowsOf([{ name: "Cor", values: [] }], null, "Categoria")).toEqual([])
  })
})
