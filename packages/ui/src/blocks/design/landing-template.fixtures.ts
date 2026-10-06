// Block
import type { LandingTemplateOption } from "./landing-template-picker"

/** What the API offers a shop's new landing: three built around a product, and the blank one. */
export const SHOP_LANDINGS: LandingTemplateOption[] = [
  { id: "lancamento", needsProduct: true },
  { id: "promocao-relampago", needsProduct: true },
  { id: "colecao", needsProduct: true },
  { id: "em-branco", needsProduct: false },
]

/** What it offers a site, which sells no product. */
export const SITE_LANDINGS: LandingTemplateOption[] = [{ id: "em-branco", needsProduct: false }]
