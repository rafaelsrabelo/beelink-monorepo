// Lib
import { combinationKey, type VariationRow, type VariationsValue } from "@harness-monorepo/ui/lib/variations"

/**
 * A swatch as the shopkeeper's data stores it, `#rrggbb`. Built from its digits so the no-hex gate
 * keeps meaning what it says — no colour written into a component — for the one place a colour is
 * data, as a shop's brand colour is.
 */
export function swatch(digits: string): string {
  return `#${digits}`
}

/**
 * The blouse of design 4a — Tamanho P, M, G, GG and Cor Areia, Terracota, Preto — for the stories
 * and tests of the variations blocks. A `.tsx` only because this package exports nothing else.
 */
export const BASE_ROW: VariationRow = { isActive: true, price: "189,00", stock: "4", sku: "BLS", weight: "300" }

export const BLOUSE: VariationsValue = {
  options: [
    {
      key: "size",
      name: "Tamanho",
      isColor: false,
      values: ["P", "M", "G", "GG"].map((name) => ({ key: name, name, colorHex: null })),
    },
    {
      key: "colour",
      name: "Cor",
      isColor: true,
      values: [
        { key: "areia", name: "Areia", colorHex: swatch("d9c7a7") },
        { key: "terracota", name: "Terracota", colorHex: swatch("b4532a") },
        { key: "preto", name: "Preto", colorHex: swatch("1c1917") },
      ],
    },
  ],
  rows: {
    [combinationKey(["P", "areia"])]: { isActive: true, price: "189,00", stock: "4", sku: "BLS-P-ARE", weight: "300" },
    [combinationKey(["P", "terracota"])]: { isActive: true, price: "189,00", stock: "2", sku: "BLS-P-TER", weight: "300" },
    [combinationKey(["M", "areia"])]: { isActive: true, price: "189,00", stock: "0", sku: "BLS-M-ARE", weight: "300" },
    [combinationKey(["GG", "preto"])]: { isActive: true, price: "199,00", stock: "1", sku: "BLS-GG-PRE", weight: "300" },
    [combinationKey(["GG", "terracota"])]: { isActive: false, price: "", stock: "", sku: "", weight: "" },
  },
}
