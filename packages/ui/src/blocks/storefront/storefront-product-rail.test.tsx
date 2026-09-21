// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontProductRail } from "./storefront-product-rail"

const products = [
  { id: "p1", slug: "bolsa-amora", name: "Bolsa Amora", priceCents: 18900, compareAtPriceCents: 24900, imageUrl: "https://cdn/1.png" },
  { id: "p2", slug: "bolsa-serena", name: "Bolsa Serena", priceCents: 22500, compareAtPriceCents: null, imageUrl: null },
]

function renderRail(overrides: Partial<Parameters<typeof StorefrontProductRail>[0]> = {}) {
  return render(
    <StorefrontProductRail
      products={products}
      productHref={(slug) => `/lessari/produtos/${slug}`}
      locale="pt-BR"
      {...overrides}
    />,
  )
}

describe("StorefrontProductRail", () => {
  it("sends every card to its own product, the crawler's copy included", () => {
    renderRail()

    expect(screen.getByRole("link", { name: /Bolsa Amora/ })).toHaveAttribute(
      "href",
      "/lessari/produtos/bolsa-amora",
    )
    expect(screen.getByRole("link", { name: /Bolsa Serena/ })).toHaveAttribute(
      "href",
      "/lessari/produtos/bolsa-serena",
    )
  })

  /**
   * WCAG 2.1.1: the arrow keys scroll whatever holds focus, so a rail that cannot hold focus is a
   * rail a keyboard cannot scroll. axe never sees this — jsdom lays nothing out, so nothing
   * measures as scrollable — which is why it is asserted here by tabbing into it for real.
   */
  it("takes focus itself, before the cards inside it do", async () => {
    const user = userEvent.setup()
    renderRail()

    const rail = screen.getByRole("group", { name: "Destaques" })

    await user.tab()
    expect(rail).toHaveFocus()

    await user.tab()
    expect(screen.getByRole("link", { name: /Bolsa Amora/ })).toHaveFocus()
  })

  // "group" on its own tells a visitor nothing about what they have just landed in.
  it("answers to the band's own title, and to a title the screen renames it with", () => {
    const { rerender } = renderRail()

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Destaques")

    rerender(
      <StorefrontProductRail
        products={products}
        productHref={(slug) => `/lessari/produtos/${slug}`}
        locale="pt-BR"
        title="Mais vendidos"
      />,
    )

    expect(screen.getByRole("group", { name: "Mais vendidos" })).toBeInTheDocument()
    expect(screen.queryByRole("group", { name: "Destaques" })).not.toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Mais vendidos")
  })

  /** A home with three bands hands a screen reader "Ver todos" three times, going who knows where. */
  it("names the way out after the band it leaves", () => {
    renderRail({ seeAllHref: "/lessari/produtos" })

    const seeAll = screen.getByRole("link", { name: "Ver tudo em Destaques" })
    expect(seeAll).toHaveAttribute("href", "/lessari/produtos")
    expect(seeAll).toHaveTextContent("Ver todos")
  })

  it("offers no way out when the screen gave it nowhere to go", () => {
    renderRail()

    expect(screen.queryByText("Ver todos")).not.toBeInTheDocument()
  })

  // Empty is not this block's sentence to write: only the screen knows if the shop is empty,
  // the filter matched nothing, or the home simply has no band today.
  it("renders nothing at all, title included, when there is nothing to run sideways", () => {
    const { container } = renderRail({ products: [], seeAllHref: "/lessari/produtos" })

    expect(container).toBeEmptyDOMElement()
  })

  it("can be told to hide prices, for a shop that quotes instead", () => {
    renderRail({ showPrice: false })

    expect(screen.queryByText(/189,00/)).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Bolsa Amora/ })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderRail({ seeAllHref: "/lessari/produtos" })

    await expectNoA11yViolations(container)
  })
})
