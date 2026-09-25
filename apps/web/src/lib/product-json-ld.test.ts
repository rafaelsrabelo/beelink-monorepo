// Libs
import { describe, expect, it } from "vitest"

// Types
import type { PublicProductDetail } from "@harness-monorepo/contracts"

// App
import { jsonLdText, productJsonLd } from "./product-json-ld"

const product = {
  id: "p1",
  slug: "haze",
  name: "Pré-Treino Haze",
  description: "**Energia** para o treino.\n\n- Foco",
  priceCents: 11990,
  compareAtPriceCents: 14990,
  soldOut: false,
  images: [{ id: "i1", url: "https://cdn/1.jpg", alt: null }],
  category: { id: "c1", slug: "pre-treino", name: "Pré-treino" },
  options: [],
  variants: [
    { id: "v1", optionValueIds: [], priceCents: 6990, compareAtPriceCents: null, imageUrl: null, available: true },
    { id: "v2", optionValueIds: [], priceCents: 20990, compareAtPriceCents: null, imageUrl: null, available: false },
  ],
} as unknown as PublicProductDetail

const crumbs = [
  { name: "Início", url: "/loja" },
  { name: "Pré-treino", url: "/loja/categorias/pre-treino" },
  { name: "Pré-Treino Haze", url: "/loja/produtos/haze" },
]

describe("productJsonLd", () => {
  it("describes the product with an offer from the cheapest to the dearest combination", () => {
    const [item, trail] = productJsonLd({ product, url: "/loja/produtos/haze", shopName: "Loja", crumbs, showPrice: true }) as [Record<string, unknown>, Record<string, unknown>]

    expect(item).toMatchObject({
      "@type": "Product",
      name: "Pré-Treino Haze",
      description: "Energia para o treino. Foco",
      image: ["https://cdn/1.jpg"],
      offers: { "@type": "AggregateOffer", priceCurrency: "BRL", lowPrice: "69.90", highPrice: "209.90", offerCount: 2, availability: "https://schema.org/InStock" },
    })
    expect(item).not.toHaveProperty("aggregateRating")
    expect(trail).toMatchObject({ "@type": "BreadcrumbList", itemListElement: [{ position: 1, name: "Início", item: "/loja" }, { position: 2 }, { position: 3, name: "Pré-Treino Haze" }] })
  })

  it("says out of stock when nothing can be ordered, and offers nothing when the shop hides prices", () => {
    const soldOut = { ...product, variants: product.variants.map((variant) => ({ ...variant, available: false })) }
    const [item] = productJsonLd({ product: soldOut, url: "/x", shopName: "Loja", crumbs, showPrice: true }) as [Record<string, { availability: string }>]
    expect(item.offers?.availability).toBe("https://schema.org/OutOfStock")

    const [hidden] = productJsonLd({ product, url: "/x", shopName: "Loja", crumbs, showPrice: false }) as [Record<string, unknown>]
    expect(hidden).not.toHaveProperty("offers")
  })

  it("prices a product without combinations at its own price", () => {
    const [item] = productJsonLd({ product: { ...product, variants: [] }, url: "/x", shopName: "Loja", crumbs, showPrice: true }) as [Record<string, { lowPrice: string; highPrice: string }>]

    expect(item.offers).toMatchObject({ lowPrice: "119.90", highPrice: "119.90" })
  })
})

describe("jsonLdText", () => {
  it("escapes every '<', so a name cannot close the script tag", () => {
    const text = jsonLdText({ name: "</script><script>alert(1)</script>" })

    expect(text).not.toContain("<")
    expect(JSON.parse(text)).toEqual({ name: "</script><script>alert(1)</script>" })
  })
})
