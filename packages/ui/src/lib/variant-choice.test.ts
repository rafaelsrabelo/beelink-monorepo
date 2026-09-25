// Libs
import { describe, expect, it } from "vitest"

// Lib
import { BLOUSE_OPTIONS, BLOUSE_VARIANTS } from "../blocks/storefront/variant-choice-fixtures"
import { initialVariantOf, selectionOf, targetOf, valueStateOf, variantLabelOf, variantOf } from "./variant-choice"

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

  it("says what each value would lead to", () => {
    const selection = selectionOf(BLOUSE_VARIANTS[0]!, BLOUSE_OPTIONS)

    expect(valueStateOf(selection, "colour", "terracota", BLOUSE_OPTIONS, BLOUSE_VARIANTS)).toBe("available")
    expect(valueStateOf(selection, "size", "M", BLOUSE_OPTIONS, BLOUSE_VARIANTS)).toBe("soldOut")
    // G·Areia is not sold, but G·Preto is: G leads there, and only GG leads nowhere.
    expect(valueStateOf(selection, "size", "G", BLOUSE_OPTIONS, BLOUSE_VARIANTS)).toBe("available")
    expect(valueStateOf(selection, "size", "GG", BLOUSE_OPTIONS, BLOUSE_VARIANTS)).toBe("missing")
  })

  it("reaches a combination that differs in two options, keeping what it can of the choice", () => {
    const selection = selectionOf(BLOUSE_VARIANTS[0]!, BLOUSE_OPTIONS)

    expect(targetOf(selection, "size", "G", BLOUSE_OPTIONS, BLOUSE_VARIANTS)?.id).toBe("g-preto")
    expect(targetOf({ size: "M", colour: "areia" }, "size", "P", BLOUSE_OPTIONS, BLOUSE_VARIANTS)?.id).toBe("p-areia")
  })

  it("prefers a combination that can be ordered when it has to move", () => {
    const variants = [
      { ...BLOUSE_VARIANTS[2]!, id: "m-areia" },
      { ...BLOUSE_VARIANTS[2]!, id: "m-preto", optionValueIds: ["M", "preto"], available: true },
    ]

    expect(targetOf({ size: "P", colour: "terracota" }, "size", "M", BLOUSE_OPTIONS, variants)?.id).toBe("m-preto")
  })

  it("names a combination as the order message does", () => {
    expect(variantLabelOf(BLOUSE_VARIANTS[1]!, BLOUSE_OPTIONS)).toBe("P · Terracota")
  })
})
