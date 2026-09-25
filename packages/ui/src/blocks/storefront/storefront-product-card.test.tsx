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

  it("is one link with no frame when compact — 5b's related card — the price one string, no badge", () => {
    const { container } = renderCard({ density: "compact" })

    const link = screen.getByRole("link", { name: /Bolsa Amora/ })
    expect(link).toHaveAttribute("href", "/lessari/produtos/bolsa-amora")
    // The price's sr-only text is absolute: the card has to hold it, inside the rail's scroller.
    expect(link).toHaveClass("relative")
    expect(container.querySelector("article")).toBeNull()
    expect(screen.getByText("Bolsa Amora")).toHaveClass("text-[14px]", "text-shop-primary-ink")
    expect(link).toHaveTextContent("R$ 189,00")
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument()
    expect(container.querySelector("img")?.closest("span")).toHaveClass("h-[180px]")
  })

  // "Ver opções" is drawn, not a link: a press on it has to fall through to the card's own link.
  it("lets a press on the action's drawing through to the card's link", () => {
    const { container } = renderCard({ action: <span>Ver opções</span> })

    expect(screen.getByText("Ver opções").parentElement).toHaveClass("pointer-events-none")
    expect(container.querySelector("a")).toHaveClass("after:absolute", "after:inset-0")
  })

  it("passes through its photos when it has more than one, and draws the cover alone otherwise", () => {
    const { container, rerender } = renderCard({ product: { ...product, imageUrls: ["/1.jpg", "/2.jpg"] } })
    expect(container.querySelectorAll("img")).toHaveLength(2)
    expect(container.querySelector(".snap-x")).not.toBeNull()

    rerender(<StorefrontProductCard product={{ ...product, imageUrls: ["/1.jpg"] }} href="/x" locale="pt-BR" />)
    expect(container.querySelectorAll("img")).toHaveLength(1)
    expect(container.querySelector(".snap-x")).toBeNull()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderCard()

    await expectNoA11yViolations(container)
  })
})
