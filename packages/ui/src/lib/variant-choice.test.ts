// Libs
import { describe, expect, it } from "vitest"

// Lib
import { BLOUSE_OPTIONS, BLOUSE_VARIANTS } from "../blocks/storefront/variant-choice-fixtures"
import { initialVariantOf, selectionOf, valueStateOf, variantLabelOf, variantOf } from "./variant-choice"

describe("choosing a combination", () => {
  it("opens on the one the address asked for, else the first that can be ordered", () => {
    expect(initialVariantOf(BLOUSE_VARIANTS, "g-preto")?.id).toBe("g-preto")
    expect(initialVariantOf(BLOUSE_VARIANTS, "gone")?.id).toBe("p-areia")
    expect(initialVariantOf([{ ...BLOUSE_VARIANTS[2]! }], null)?.id).toBe("m-areia")
  })

  it("finds the variant of a selection, and none for a combination not sold", () => {
    expect(variantOf({ size: "P", colour: "terracota" }, BLOUSE_OPTIONS, BLOUSE_VARIANTS)?.id).toBe("p-terracota")
    expect(variantOf({ size: "M", colour: "preto" }, BLOUSE_OPTIONS, BLOUSE_VARIANTS)).toBeUndefined()
  })

  it("says what each value would lead to with the others as they are", () => {
    const selection = selectionOf(BLOUSE_VARIANTS[0]!, BLOUSE_OPTIONS)

    expect(valueStateOf(selection, "colour", "terracota", BLOUSE_OPTIONS, BLOUSE_VARIANTS)).toBe("available")
    expect(valueStateOf(selection, "size", "M", BLOUSE_OPTIONS, BLOUSE_VARIANTS)).toBe("soldOut")
    expect(valueStateOf(selection, "size", "G", BLOUSE_OPTIONS, BLOUSE_VARIANTS)).toBe("missing")
  })

  it("names a combination as the order message does", () => {
    expect(variantLabelOf(BLOUSE_VARIANTS[1]!, BLOUSE_OPTIONS)).toBe("P · Terracota")
  })
})
