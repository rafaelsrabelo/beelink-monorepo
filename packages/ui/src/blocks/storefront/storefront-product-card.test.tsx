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

  it("says how far the shop splits the price, under it, and nothing when it gives no terms or hides the price", () => {
    const terms = { maxInstallments: 6, minimumChargeCents: 500, minimumInstallmentCents: 500 }
    const { rerender } = renderCard({ installments: terms })
    expect(screen.getByText(/em até 6x de R\$\s31,50 sem juros/)).toBeInTheDocument()

    rerender(<StorefrontProductCard product={product} href="/lessari/produtos/bolsa-amora" locale="pt-BR" />)
    expect(screen.queryByText(/sem juros/)).not.toBeInTheDocument()

    rerender(<StorefrontProductCard product={product} href="/lessari/produtos/bolsa-amora" locale="pt-BR" installments={terms} showPrice={false} />)
    expect(screen.queryByText(/sem juros/)).not.toBeInTheDocument()
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

  it("says how many values its first option has under the name, and nothing for one with none to choose", () => {
    const { rerender } = renderCard({ product: { ...product, optionSummary: { name: "Sabor", valueCount: 4 } } })
    expect(screen.getByText("4 sabores")).toBeInTheDocument()

    rerender(<StorefrontProductCard product={{ ...product, optionSummary: { name: "Sabor", valueCount: 1 } }} href="/x" locale="pt-BR" />)
    expect(screen.queryByText(/sabor/)).not.toBeInTheDocument()
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

  it("draws the rating line under the name when the product has reviews, unless the shop hides it", () => {
    const { rerender } = renderCard({ product: { ...product, rating: { average: 4.5, count: 12 } } })
    expect(screen.getByText("Nota 4,5 de 5, 12 avaliações")).toBeInTheDocument()

    rerender(<StorefrontProductCard product={{ ...product, rating: { average: 4.5, count: 12 } }} href="/lessari/produtos/bolsa-amora" locale="pt-BR" showRating={false} />)
    expect(screen.queryByText(/avaliações/)).not.toBeInTheDocument()
  })

  it("puts the heart over the photo's corner, above the card's link", () => {
    renderCard({ favorite: <button type="button">Curtir Bolsa Amora</button> })

    const corner = screen.getByRole("button", { name: "Curtir Bolsa Amora" }).parentElement
    expect(corner).toHaveClass("absolute", "z-10")
    expect(corner?.parentElement).toHaveClass("aspect-[259/230]")
  })

  it("keeps the saving and the heart on opposite corners of the photo, so neither covers the other", () => {
    renderCard({ favorite: <button type="button">Curtir Bolsa Amora</button> })

    const saving = screen.getByText("-24%")
    const heart = screen.getByRole("button", { name: "Curtir Bolsa Amora" }).parentElement!
    expect(saving.parentElement).toBe(heart.parentElement)
    expect(saving).toHaveClass("top-2.5", "left-2.5")
    expect(heart).toHaveClass("top-2.5", "right-2.5")
    expect(saving.className).not.toMatch(/\bright-/)
    expect(heart.className).not.toMatch(/\bleft-/)
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
