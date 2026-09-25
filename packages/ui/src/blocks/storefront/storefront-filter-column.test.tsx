// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontFilterColumn } from "./storefront-filter-column"
import { StorefrontFilterSection } from "./storefront-filter-section"

const chips = [
  { label: "R$ 100 a R$ 200", href: "/loja/produtos?opcao=Peso%3A300+g" },
  { label: "300 g", href: "/loja/produtos?precoMin=100&precoMax=200" },
]

describe("StorefrontFilterColumn", () => {
  it("is a complementary landmark named 'Filtros', drawn from shop-lg", () => {
    render(<StorefrontFilterColumn />)

    const aside = screen.getByRole("complementary", { name: "Filtros" })
    expect(aside).toHaveClass("hidden", "shop-lg:flex", "w-66")
    expect(screen.getByRole("heading", { level: 2, name: "Filtros" })).toBeInTheDocument()
  })

  it("lists what is in force as links that take each one off, named for a reader", () => {
    render(<StorefrontFilterColumn chips={chips} clearHref="/loja/produtos" />)

    const chip = screen.getByRole("link", { name: "Remover filtro 300 g" })
    expect(chip).toHaveAttribute("href", "/loja/produtos?precoMin=100&precoMax=200")
    expect(screen.getByRole("link", { name: "Limpar tudo" })).toHaveAttribute("href", "/loja/produtos")
  })

  it("offers 'Limpar tudo' only while something is in force", () => {
    render(<StorefrontFilterColumn clearHref="/loja/produtos" />)

    expect(screen.queryByRole("link", { name: "Limpar tudo" })).toBeNull()
    expect(screen.queryByRole("list")).toBeNull()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <StorefrontFilterColumn chips={chips} clearHref="/loja/produtos">
        <StorefrontFilterSection title="Preço">
          <a href="/loja/produtos?precoMax=50">Até R$ 50</a>
        </StorefrontFilterSection>
      </StorefrontFilterColumn>,
    )

    await expectNoA11yViolations(container)
  })
})
