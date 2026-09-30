// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontFavoritesEmpty } from "./storefront-favorites-empty"

describe("StorefrontFavoritesEmpty", () => {
  it("invites a shopper who never liked anything to the shelf, and one whose filter found nothing back to all", () => {
    const { rerender } = render(<StorefrontFavoritesEmpty variant="none" href="/loja/produtos" />)
    expect(screen.getByText(/Toque no coração de um produto para guardá-lo aqui/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ver produtos" })).toHaveAttribute("href", "/loja/produtos")

    rerender(<StorefrontFavoritesEmpty variant="filtered" href="/loja/conta/favoritos" />)
    expect(screen.getByText("Nenhum favorito neste filtro.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ver todos os favoritos" })).toHaveAttribute("href", "/loja/conta/favoritos")
  })

  it("says a list that could not be read failed, and offers to read it again", () => {
    render(<StorefrontFavoritesEmpty variant="unavailable" href="/loja/conta/favoritos?filtro=baixou" />)

    expect(screen.getByRole("alert")).toHaveTextContent("Não deu para carregar seus favoritos agora.")
    expect(screen.getByRole("link", { name: "Tentar de novo" })).toHaveAttribute("href", "/loja/conta/favoritos?filtro=baixou")
  })

  it("has no accessibility violations", async () => {
    const { container, rerender } = render(<StorefrontFavoritesEmpty variant="none" href="#" />)
    await expectNoA11yViolations(container)

    rerender(<StorefrontFavoritesEmpty variant="unavailable" href="#" />)
    await expectNoA11yViolations(container)
  })
})
