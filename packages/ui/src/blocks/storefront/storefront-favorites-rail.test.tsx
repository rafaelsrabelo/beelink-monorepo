// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontFavoritesRail, type StorefrontFavoritesRailItem } from "./storefront-favorites-rail"

const items: StorefrontFavoritesRailItem[] = [
  { productId: "p1", href: "/loja/produtos/whey", name: "Whey Protein 900g", imageUrl: null, priceCents: 16990, dropCents: 2000, soldOut: false },
  { productId: "p2", href: "/loja/produtos/haze", name: "Pré-Treino Haze", imageUrl: null, priceCents: 11990, dropCents: 0, soldOut: true },
]

describe("StorefrontFavoritesRail", () => {
  it("heads the row with how many and how many got cheaper, and leads to all of them", () => {
    render(<StorefrontFavoritesRail items={items} total={12} dropped={2} allHref="/loja/conta/favoritos" locale="pt-BR" />)

    expect(screen.getByRole("heading", { level: 2, name: "Seus favoritos" })).toBeInTheDocument()
    expect(screen.getByText("12 produtos · 2 baixaram de preço")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ver todos (12)" })).toHaveAttribute("href", "/loja/conta/favoritos")
  })

  it("draws each with today's price, how much it dropped, and whether it ran out", () => {
    render(<StorefrontFavoritesRail items={items} total={2} dropped={1} allHref="#" locale="pt-BR" />)

    const whey = screen.getByRole("link", { name: /Whey Protein 900g/ })
    expect(whey).toHaveAttribute("href", "/loja/produtos/whey")
    expect(within(whey).getByText(/169,90/)).toBeInTheDocument()
    expect(within(whey).getByText(/Baixou R\$\s20,00/)).toBeInTheDocument()
    expect(within(screen.getByRole("link", { name: /Pré-Treino Haze/ })).getByText("Esgotado")).toBeInTheDocument()
    expect(screen.getByText("2 produtos · 1 baixou de preço")).toBeInTheDocument()
  })

  it("says one product in the singular, and nothing of drops when none dropped", () => {
    render(<StorefrontFavoritesRail items={items.slice(0, 1)} total={1} dropped={0} allHref="#" locale="pt-BR" />)
    expect(screen.getByText("1 produto")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontFavoritesRail items={items} total={12} dropped={2} allHref="#" locale="pt-BR" />)
    await expectNoA11yViolations(container)
  })
})
