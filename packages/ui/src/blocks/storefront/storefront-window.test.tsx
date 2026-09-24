// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { sampleStoreColors } from "../store/store.fixtures"
import { StorefrontWindow } from "./storefront-window"

// Read from the fixtures, which read from JSON: `web/no-hex-colors` scans this file too, and it
// is right to — a colour written into a module is a token that escaped.
const colors = sampleStoreColors

function renderWindow(overrides: Partial<Parameters<typeof StorefrontWindow>[0]> = {}) {
  return render(
    <StorefrontWindow name="Padaria da Ana" homeHref="/padaria-da-ana" colors={colors} {...overrides} />,
  )
}

describe("StorefrontWindow", () => {
  /**
   * The panel is ours and looks like us; the window is the shopkeeper's and must not. The colours
   * arrive as data and become custom properties, which is also why the no-hex-colors gate is
   * untroubled — it forbids a literal in source, and there is none.
   */
  it("wears the typeface the app names, and the page's where none is named", () => {
    const { container } = renderWindow()

    expect((container.firstElementChild as HTMLElement).style.fontFamily).toBe("var(--font-shop, inherit)")
  })

  it("wears the shop's own colours, from data", () => {
    const { container } = renderWindow()
    const dressed = container.firstElementChild as HTMLElement

    expect(dressed.style.getPropertyValue("--shop-primary")).toBe(colors.primary)
    expect(dressed.style.getPropertyValue("--shop-background")).toBe(colors.background)
    expect(colors.primary).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })

  describe("the header", () => {
    /** A site's header: the page's named bands as anchors, where a shop has its icons. */
    it("draws a site's menu of anchors, named for a screen reader", () => {
      renderWindow({
        menu: [
          { id: "a", label: "Serviços", href: "#servicos" },
          { id: "b", label: "Contato", href: "#contato" },
        ],
      })

      const menu = screen.getByRole("navigation", { name: "Seções do site" })
      expect(within(menu).getByRole("link", { name: "Serviços" })).toHaveAttribute("href", "#servicos")
      expect(within(menu).getAllByRole("link")).toHaveLength(2)
    })

    it("draws no menu at all when there is none, rather than an empty landmark", () => {
      renderWindow()

      expect(screen.queryByRole("navigation", { name: "Seções do site" })).not.toBeInTheDocument()
    })

    it("takes the logo home, so a product page has a way back", () => {
      renderWindow({ logoUrl: "https://cdn/logo.png" })

      expect(screen.getByRole("banner").querySelector("a")).toHaveAttribute("href", "/padaria-da-ana")
    })

    /*
      The logo replaces the name rather than sitting beside it, which is what a masthead does — and
      it is why the image carries the shop's name as its `alt`. Without that the link would be a
      picture with no accessible name, or would announce "Logo da loja" on every shop in the
      product, which names nothing.
    */
    it("lets the logo stand in for the name, and say it", () => {
      renderWindow({ logoUrl: "https://cdn/logo.png" })
      const banner = screen.getByRole("banner")

      expect(within(banner).getByRole("img", { name: "Padaria da Ana" })).toBeInTheDocument()
      expect(within(banner).queryByText("Padaria da Ana")).not.toBeInTheDocument()
    })

    it("falls back to the name as words when there is no logo yet", () => {
      renderWindow({ logoUrl: null })
      const banner = screen.getByRole("banner")

      expect(within(banner).getByText("Padaria da Ana")).toBeInTheDocument()
      expect(within(banner).queryByRole("img")).not.toBeInTheDocument()
    })

    /**
     * The window places the search and hands it one address; what the field itself does is
     * `storefront-search.test.tsx`. The address is this file's business because searching now
     * leaves for a page of its own — a form posting to the page it stands on is the old single
     * filtered page, not a search.
     */
    it("points the header's search at the address the screen gave it", () => {
      renderWindow({ searchAction: "/padaria-da-ana/busca", searchValue: "bolo" })

      const form = within(screen.getByRole("banner")).getByRole("search")
      expect(form).toHaveAttribute("method", "get")
      expect(form).toHaveAttribute("action", "/padaria-da-ana/busca")
      expect(screen.getByRole("searchbox", { name: "Buscar nesta loja" })).toHaveValue("bolo")
    })

    it("draws no search when the screen has nowhere to send one", () => {
      renderWindow()

      expect(screen.queryByRole("search")).not.toBeInTheDocument()
    })

    it("carries what the screen pinned to the search rather than dropping it on the way", () => {
      const { container } = renderWindow({
        searchAction: "/padaria-da-ana/busca",
        searchHidden: { categoria: "promocoes" },
      })

      expect(container.querySelector('input[name="categoria"]')).toHaveValue("promocoes")
    })

    /**
     * There is no cart and no buyer account in the product. An icon that goes nowhere teaches a
     * visitor that the rest of the page is a mockup, so neither renders until the screen has an
     * address to give it.
     */
    it("offers no cart and no account until the screen has somewhere to send them", () => {
      renderWindow()

      expect(screen.queryByRole("link", { name: /Carrinho/ })).not.toBeInTheDocument()
      expect(screen.queryByRole("link", { name: "Minha conta" })).not.toBeInTheDocument()
    })

    it("shows them, counted, once it does", () => {
      renderWindow({ cartHref: "/padaria-da-ana/carrinho", cartCount: 3, accountHref: "/padaria-da-ana/conta" })

      expect(screen.getByRole("link", { name: "Carrinho, 3 itens" })).toHaveAttribute("href", "/padaria-da-ana/carrinho")
      expect(screen.getByRole("link", { name: /Minha conta/ })).toBeInTheDocument()
      expect(screen.getByText("3")).toBeInTheDocument()
    })
  })

  describe("the bands", () => {
    // A band with no data does not render, so a shop with six bags and no banner is a short page
    // rather than a page of empty strips.
    it("draws no band for what the shop has not filled in", () => {
      const { container } = renderWindow()

      expect(container.querySelectorAll("img")).toHaveLength(0)
      expect(screen.queryByRole("navigation")).not.toBeInTheDocument()
    })

    it("draws the cover, and links it when the shopkeeper gave it somewhere to go", () => {
      renderWindow({ banner: { imageUrl: "https://cdn/capa.png", href: "/padaria-da-ana?categoria=promocoes" } })

      expect(screen.getByRole("link", { name: "" })).toHaveAttribute(
        "href",
        "/padaria-da-ana?categoria=promocoes",
      )
    })

    /** A banner whose words are painted into the JPEG has nothing a screen reader can read. */
    it("hides a wordless cover from a screen reader, and describes one that was described", () => {
      const { container, rerender } = renderWindow({ banner: { imageUrl: "https://cdn/a.png" } })
      expect(container.querySelector("img")).toHaveAttribute("aria-hidden", "true")

      rerender(
        <StorefrontWindow
          name="Padaria da Ana"
          homeHref="/padaria-da-ana"
          colors={colors}
          banner={{ imageUrl: "https://cdn/a.png", alt: "Bolos de aniversário" }}
        />,
      )
      expect(screen.getByAltText("Bolos de aniversário")).not.toHaveAttribute("aria-hidden")
    })

    it("renders the catalogue the screen put under it", () => {
      renderWindow({ children: <p>A grade de produtos</p> })

      expect(screen.getByText("A grade de produtos")).toBeInTheDocument()
    })
  })

  describe("the page's own strip and rhythm", () => {
    it("draws the page's strip between the header and the main, edge to edge", () => {
      renderWindow({ pageHeader: <div data-testid="strip">Pré-treino · 86 resultados</div>, children: <p>A grade</p> })

      const strip = screen.getByTestId("strip")
      const main = screen.getByRole("main")
      expect(strip.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(main.contains(strip)).toBe(false)
      expect(screen.getByRole("banner").contains(strip)).toBe(false)
    })

    it("keeps the plain page's rhythm by default, and hands it to the page when asked", () => {
      const { rerender } = renderWindow({ children: <p>A grade</p> })
      expect(screen.getByRole("main")).toHaveClass("py-8")

      rerender(<StorefrontWindow name="Padaria da Ana" homeHref="/padaria-da-ana" colors={colors} layout="flush" surface="canvas"><p>A grade</p></StorefrontWindow>)
      const main = screen.getByRole("main")
      expect(main).not.toHaveClass("py-8")
      expect(main.style.backgroundColor).toBe("var(--shop-canvas)")
      // The measure stays: flush is about rhythm, never about width.
      expect(screen.getByText("A grade").parentElement).toHaveClass("max-w-[1440px]")
    })
  })

  describe("the footer", () => {
    /* Same rule as the masthead, and asserted separately because they are two call sites. */
    it("lets the logo stand in for the name there too", () => {
      renderWindow({ logoUrl: "https://cdn/logo.png" })
      const footer = screen.getByRole("contentinfo")

      expect(within(footer).getByRole("img", { name: "Padaria da Ana" })).toBeInTheDocument()
      expect(within(footer).queryByText("Padaria da Ana")).not.toBeInTheDocument()
    })

    it("names the shop and where it is", () => {
      renderWindow({ addressLine: "Rua das Flores, 120 — Fortaleza" })

      expect(within(screen.getByRole("contentinfo")).getByText("Rua das Flores, 120 — Fortaleza")).toBeInTheDocument()
    })

    // An icon with no words announces itself as "link" and nothing else.
    it("names every network it links to", () => {
      renderWindow({ links: [{ network: "instagram", href: "https://instagram.com/padaria" }] })

      expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute(
        "href",
        "https://instagram.com/padaria",
      )
    })
  })

  it("offers the order button only when the shop has a WhatsApp to send it to", () => {
    renderWindow({ description: "Pães e bolos." })
    expect(screen.queryByRole("link", { name: /WhatsApp/ })).not.toBeInTheDocument()

    renderWindow({ description: "Pães e bolos.", orderHref: "https://wa.me/5585999998888" })
    expect(screen.getByRole("link", { name: "Fazer pedido no WhatsApp" })).toBeInTheDocument()
  })

  it("renders in English when the screen hands it the English dictionary", () => {
    renderWindow({
      messages: en,
      description: "Bread and cakes.",
      orderHref: "https://wa.me/1",
      searchAction: "/ana-bakery/search",
    })

    expect(screen.getByRole("link", { name: "Order on WhatsApp" })).toBeInTheDocument()
    // The dictionary has to reach the bands the window hands to another block, not only the
    // sentences it renders itself: a Portuguese field inside an English shop looks like a bug
    // in the shop, and nothing else in this file would see it.
    expect(screen.getByRole("searchbox", { name: "Search this shop" })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <StorefrontWindow
        name="Padaria da Ana"
        description="Pães e bolos feitos no dia."
        logoUrl="https://cdn/logo.png"
        homeHref="/padaria-da-ana"
        colors={colors}
        searchAction="/padaria-da-ana"
        cartHref="/padaria-da-ana/carrinho"
        cartCount={2}
        accountHref="/padaria-da-ana/conta"
        banner={{ imageUrl: "https://cdn/capa.png", alt: "Bolos" }}
        orderHref="https://wa.me/5585999998888"
        links={[{ network: "instagram", href: "https://instagram.com/padaria" }]}
        addressLine="Rua das Flores, 120"
      >
        <p>Produtos</p>
      </StorefrontWindow>,
    )

    await expectNoA11yViolations(container)
  })
})
