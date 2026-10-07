// Libs
import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

// Types
import type { StorefrontCatalog } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { CART_COOKIE } from "@/lib/cart-cookie"
import { CartProvider } from "./cart-provider"
import { StorefrontCartLinkLive } from "./storefront-cart-link-live"
import { StorefrontRelated } from "./storefront-related"
import { TrackingContext } from "./tracking/use-track"

const card = (at: number) => ({ id: `p${at}`, slug: `produto-${at}`, name: `Produto ${at}`, priceCents: 9990, compareAtPriceCents: null, imageUrl: null })

function catalogueOf(count: number): StorefrontCatalog {
  return { products: Array.from({ length: count }, (_, at) => card(at)) } as unknown as StorefrontCatalog
}

async function renderRelated(catalogue: Promise<StorefrontCatalog | null>, productId = "p0") {
  return render(await StorefrontRelated({ catalogue, productId, productHref: (slug) => `/loja/produtos/${slug}`, showPrice: true, messages: ptBR }))
}

describe("StorefrontRelated", () => {
  it("never suggests the product on the page", async () => {
    await renderRelated(Promise.resolve(catalogueOf(5)))

    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"))
    expect(hrefs).toHaveLength(4)
    expect(hrefs).not.toContain("/loja/produtos/produto-0")
  })

  it("holds three pages of six, whatever the read brings", async () => {
    await renderRelated(Promise.resolve(catalogueOf(25)), "outro")

    expect(screen.getAllByRole("link")).toHaveLength(18)
  })

  it("draws no rail when the read failed, or found only this product", async () => {
    const failed = await renderRelated(Promise.resolve(null))
    expect(failed.container).toBeEmptyDOMElement()
    failed.unmount()

    const alone = await renderRelated(Promise.resolve(catalogueOf(1)))
    expect(alone.container).toBeEmptyDOMElement()
  })

  describe("adding to the cart from the rail", () => {
    const ID = "01a0d395-c1ab-7399-a472-00000000000"
    const simple = { ...card(1), id: `${ID}1`, name: "Creatina", priceCents: 4990, hasOptions: false }
    const withOptions = { ...card(2), id: `${ID}2`, name: "Whey", hasOptions: true }
    const unknown = { ...card(3), id: `${ID}3`, name: "Barra" }
    const catalogue = () => Promise.resolve({ products: [simple, withOptions, unknown] } as unknown as StorefrontCatalog)

    afterEach(() => {
      document.cookie = `${CART_COOKIE}=; Path=/loja; Max-Age=0`
    })

    async function renderRail(quickAdd: boolean, track = vi.fn()) {
      window.history.replaceState(null, "", "/loja/produtos/magnesio")
      const rail = await StorefrontRelated({ catalogue: catalogue(), productId: "p0", productHref: (slug) => `/loja/produtos/${slug}`, showPrice: true, quickAdd, messages: ptBR })
      render(
        <TrackingContext value={{ allowed: true, track }}>
          <CartProvider slug="loja" lines={[]}>
            <StorefrontCartLinkLive href="/loja/carrinho" messages={ptBR} />
            {rail}
          </CartProvider>
        </TrackingContext>,
      )
      return track
    }

    it("puts a product without options in the cart from its \"+\", and tells it by the one way an addition is told", async () => {
      const track = await renderRail(true)

      fireEvent.click(screen.getByRole("button", { name: "Adicionar Creatina ao carrinho" }))

      expect(screen.getByRole("link", { name: "Carrinho, 1 item" })).toBeInTheDocument()
      expect(screen.getByRole("status")).toHaveTextContent("Creatina foi adicionado ao carrinho.")
      expect(track.mock.calls).toEqual([[{ name: "AddToCart", item: { productId: simple.id, qty: 1, name: "Creatina", unitPriceCents: 4990 } }]])
    })

    // One with options is chosen on its page, as on a shelf — and so is one the read did not say.
    it("offers no \"+\" for a product with options, or one not known to have none", async () => {
      await renderRail(true)

      expect(screen.getAllByRole("button", { name: /^Adicionar .* ao carrinho$/ })).toHaveLength(1)
      expect(screen.getAllByText("Ver opções")).toHaveLength(2)
    })

    it("draws no action at a shop that switched quick adding off", async () => {
      await renderRail(false)

      expect(screen.queryByRole("button", { name: /^Adicionar/ })).toBeNull()
      expect(screen.queryByText("Ver opções")).toBeNull()
    })
  })
})
