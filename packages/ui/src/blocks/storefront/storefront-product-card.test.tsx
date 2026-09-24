// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontProductCard, type StorefrontProductCardProps } from "./storefront-product-card"

const product = {
  id: "p1",
  slug: "bolsa-amora",
  name: "Bolsa Amora",
  priceCents: 18900,
  compareAtPriceCents: 24900,
  imageUrl: "https://cdn/1.png",
}

function renderCard(overrides: Partial<StorefrontProductCardProps> = {}) {
  return render(<StorefrontProductCard product={product} href="/lessari/produtos/bolsa-amora" locale="pt-BR" {...overrides} />)
}

describe("StorefrontProductCard", () => {
  it("is one article with one link, the name, stretched over the whole card", () => {
    renderCard()

    const links = screen.getAllByRole("link")
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute("href", "/lessari/produtos/bolsa-amora")
    expect(links[0]).toHaveTextContent("Bolsa Amora")
    expect(links[0]).toHaveClass("after:absolute", "after:inset-0")
    expect(screen.getByRole("article")).toHaveClass("relative")
  })

  it("puts the saving over the photo and the split price under the name", () => {
    renderCard()

    const photo = screen.getByRole("article").firstElementChild!
    expect(photo.querySelector("img")).toHaveAttribute("alt", "")
    expect(photo).toHaveTextContent("-24%")
    expect(screen.getByText(/249,00/).tagName).toBe("S")
  })

  it("says so plainly when a product has no photograph yet, and hides the saving when asked", () => {
    renderCard({ product: { ...product, imageUrl: null }, showBadge: false })

    expect(screen.getByText("Sem foto")).toBeInTheDocument()
    expect(screen.queryByText("-24%")).not.toBeInTheDocument()
  })

  it("can be told to hide the price, for a shop that quotes instead", () => {
    renderCard({ showPrice: false })

    expect(screen.queryByText(/189,00/)).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Bolsa Amora" })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderCard()

    await expectNoA11yViolations(container)
  })
})
