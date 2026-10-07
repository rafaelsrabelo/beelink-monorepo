/**
 * A square of artwork with its words painted in, as a data URI — what a shopkeeper uploads for a
 * card drawn as the artwork alone. Made here so a story shows the case that matters: a picture that
 * already says the category's name.
 */
export function categoryArt(words: string, offer: string, colour: string): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'>` +
    `<rect width='600' height='600' fill='${colour}'/>` +
    `<text x='48' y='120' font-family='sans-serif' font-size='56' font-weight='700' fill='white'>${words}</text>` +
    `<text x='48' y='540' font-family='sans-serif' font-size='44' fill='white'>${offer}</text>` +
    `</svg>`

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/** A shop's categories with their artwork, and one the shopkeeper has not made a picture for yet. */
export const artCategories = [
  { id: "1", slug: "ferramentas", name: "Ferramentas", imageUrl: categoryArt("Ferramentas", "até 41% OFF", "seagreen"), productCount: 12 },
  { id: "2", slug: "tintas", name: "Tintas", imageUrl: categoryArt("Tintas", "a partir de R$ 19", "steelblue"), productCount: 31 },
  { id: "3", slug: "pisos", name: "Pisos", imageUrl: categoryArt("Pisos", "10x sem juros", "peru"), productCount: 37 },
  { id: "4", slug: "iluminacao", name: "Iluminação", imageUrl: categoryArt("Iluminação", "novidades", "slateblue"), productCount: 8 },
  { id: "5", slug: "jardim", name: "Jardim", imageUrl: null, productCount: 5 },
  { id: "6", slug: "banheiro", name: "Banheiro", imageUrl: categoryArt("Banheiro", "até 30% OFF", "teal"), productCount: 9 },
  { id: "7", slug: "cozinha", name: "Cozinha", imageUrl: categoryArt("Cozinha", "frete grátis", "indianred"), productCount: 4 },
]
