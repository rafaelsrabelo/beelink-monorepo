// Lib
import type { ChoiceOption, ChoiceVariant } from "@harness-monorepo/ui/lib/variant-choice"

/** A swatch as the shop's data holds it; see `swatch` in the catalogue fixtures for why it is built. */
function swatch(digits: string): string {
  return `#${digits}`
}

/**
 * The blouse of design 4b, for the stories and tests of the storefront picker: P in Areia and
 * Terracota, M in Areia only (sold out), G in Preto. A `.tsx` only because this package exports
 * nothing else.
 */
export const BLOUSE_OPTIONS: ChoiceOption[] = [
  {
    id: "size",
    name: "Tamanho",
    values: [
      { id: "P", name: "P", colorHex: null },
      { id: "M", name: "M", colorHex: null },
      { id: "G", name: "G", colorHex: null },
    ],
  },
  {
    id: "colour",
    name: "Cor",
    values: [
      { id: "areia", name: "Areia", colorHex: swatch("d9c7a7") },
      { id: "terracota", name: "Terracota", colorHex: swatch("b4532a") },
      { id: "preto", name: "Preto", colorHex: swatch("1c1917") },
    ],
  },
]

const variant = (id: string, values: string[], over: Partial<ChoiceVariant> = {}): ChoiceVariant => ({
  id,
  optionValueIds: values,
  priceCents: 18900,
  compareAtPriceCents: null,
  imageUrl: null,
  available: true,
  ...over,
})

export const BLOUSE_VARIANTS: ChoiceVariant[] = [
  variant("p-areia", ["P", "areia"]),
  variant("p-terracota", ["P", "terracota"], { priceCents: 19900, imageUrl: "https://picsum.photos/seed/terracota/800/800" }),
  variant("m-areia", ["M", "areia"], { available: false }),
  variant("g-preto", ["G", "preto"], { priceCents: 21900 }),
]
