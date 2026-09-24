// Libs
import { describe, expect, it } from "vitest"

// Lib
import { swatch } from "../blocks/catalog/variation-fixtures"
import {
  addValue,
  combinationCountOf,
  combinationKey,
  combinationsOf,
  EMPTY_VARIATIONS,
  labelOf,
  patchRows,
  removeOption,
  removeValue,
  type VariationOption,
  type VariationRow,
  type VariationsValue,
} from "./variations"

const base: VariationRow = { isActive: true, price: "189,00", stock: "4", sku: "BLS" }

function option(key: string, name: string, values: string[] = []): VariationOption {
  return { key, name, isColor: false, values: values.map((value) => ({ key: value, name: value, colorHex: null })) }
}

function withOption(value: VariationsValue, entry: VariationOption): VariationsValue {
  return { ...value, options: [...value.options, entry] }
}

function labels(value: VariationsValue): string[] {
  return combinationsOf(value, base).map((combination) => labelOf(combination.values))
}

describe("the variations draft", () => {
  it("makes no combinations until an option has a value", () => {
    const draft = withOption(EMPTY_VARIATIONS, option("size", "Tamanho"))

    expect(combinationsOf(draft, base)).toEqual([])
    expect(combinationCountOf(draft.options)).toBe(0)
  })

  it("gives the first value the product's own price, stock and code", () => {
    const draft = addValue(withOption(EMPTY_VARIATIONS, option("size", "Tamanho")), "size", { key: "P", name: "P", colorHex: null }, base)

    expect(combinationsOf(draft, base)).toEqual([
      { key: "P", values: [{ key: "P", name: "P", colorHex: null }], row: base },
    ])
  })

  it("borrows a neighbour's price for a new combination, but not its stock or code", () => {
    let draft = addValue(withOption(EMPTY_VARIATIONS, option("size", "Tamanho")), "size", { key: "P", name: "P", colorHex: null }, base)
    draft = addValue(draft, "size", { key: "M", name: "M", colorHex: null }, base)

    expect(combinationsOf(draft, base)[1]?.row).toEqual({ isActive: true, price: "189,00", stock: "", sku: "" })
  })

  it("carries every row onto a new option's first value", () => {
    let draft: VariationsValue = {
      options: [option("size", "Tamanho", ["P", "M"])],
      rows: { P: { ...base, sku: "BLS-P" }, M: { ...base, price: "199,00", sku: "BLS-M" } },
    }
    draft = addValue(withOption(draft, option("colour", "Cor")), "colour", { key: "areia", name: "Areia", colorHex: swatch("d9c7a7") }, base)
    draft = addValue(draft, "colour", { key: "preto", name: "Preto", colorHex: swatch("1c1917") }, base)

    const combinations = combinationsOf(draft, base)
    expect(combinations.map((combination) => labelOf(combination.values))).toEqual([
      "P · Areia",
      "P · Preto",
      "M · Areia",
      "M · Preto",
    ])
    expect(combinations.map((combination) => combination.row.sku)).toEqual(["BLS-P", "", "BLS-M", ""])
    expect(combinations[3]?.row.price).toBe("199,00")
  })

  it("keeps a row through a reorder of options or values", () => {
    const draft: VariationsValue = {
      options: [option("size", "Tamanho", ["P", "M"]), option("colour", "Cor", ["areia"])],
      rows: { [combinationKey(["M", "areia"])]: { ...base, sku: "BLS-M" } },
    }
    const reordered = { ...draft, options: [draft.options[1]!, { ...draft.options[0]!, values: [...draft.options[0]!.values].reverse() }] }

    expect(combinationsOf(reordered, base)[0]).toMatchObject({ row: { sku: "BLS-M" } })
    expect(labels(reordered)).toEqual(["areia · M", "areia · P"])
  })

  it("drops the rows of a removed value and keeps the rest", () => {
    const draft = removeValue(
      { options: [option("size", "Tamanho", ["P", "M"])], rows: { P: { ...base, sku: "P" }, M: { ...base, sku: "M" } } },
      "size",
      "M",
    )

    expect(draft.rows).toEqual({ P: { ...base, sku: "P" } })
  })

  it("collapses onto the first combination when an option is removed", () => {
    const draft: VariationsValue = {
      options: [option("size", "Tamanho", ["P"]), option("colour", "Cor", ["areia", "preto"])],
      rows: {
        [combinationKey(["P", "areia"])]: { ...base, sku: "P-A" },
        [combinationKey(["P", "preto"])]: { ...base, sku: "P-P" },
      },
    }

    const collapsed = removeOption(draft, "colour", base)

    expect(collapsed.options.map((entry) => entry.key)).toEqual(["size"])
    expect(collapsed.rows).toEqual({ P: { ...base, sku: "P-A" } })
  })

  it("sets part of the chosen rows at once", () => {
    const draft: VariationsValue = { options: [option("size", "Tamanho", ["P", "M"])], rows: {} }
    const [first] = combinationsOf(draft, base)

    const patched = patchRows(draft, [first!], { price: "99,90" })

    expect(combinationsOf(patched, base).map((combination) => combination.row.price)).toEqual(["99,90", "99,90"])
    expect(patched.rows.P?.price).toBe("99,90")
  })
})
