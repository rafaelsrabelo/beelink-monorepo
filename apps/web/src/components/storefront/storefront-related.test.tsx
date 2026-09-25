// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Types
import type { StorefrontCatalog } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { StorefrontRelated } from "./storefront-related"

const card = (at: number) => ({ id: `p${at}`, slug: `produto-${at}`, name: `Produto ${at}`, priceCents: 9990, compareAtPriceCents: null, imageUrl: null })

function catalogueOf(count: number): StorefrontCatalog {
  return { products: Array.from({ length: count }, (_, at) => card(at)) } as unknown as StorefrontCatalog
}

async function renderRelated(catalogue: Promise<StorefrontCatalog | null>, productId = "p0") {
  return render(await StorefrontRelated({ catalogue, productId, productHref: (slug) => `/loja/produtos/${slug}`, showPrice: true, messages: ptBR }))
}

describe("StorefrontRelated", () => {
  it("never suggests the product on the page, and holds three pages of six", async () => {
    await renderRelated(Promise.resolve(catalogueOf(19)))

    const links = screen.getAllByRole("link")
    expect(links).toHaveLength(18)
    expect(screen.queryByRole("link", { name: /^Produto 0\b/ })).not.toBeInTheDocument()
  })

  it("draws no rail when the read failed, or found only this product", async () => {
    const failed = await renderRelated(Promise.resolve(null))
    expect(failed.container).toBeEmptyDOMElement()
    failed.unmount()

    const alone = await renderRelated(Promise.resolve(catalogueOf(1)))
    expect(alone.container).toBeEmptyDOMElement()
  })
})
