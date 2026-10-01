// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontReviewsEmpty } from "./storefront-reviews-empty"

describe("StorefrontReviewsEmpty", () => {
  it("says the products are rated here once an order arrives, and leads to the orders", () => {
    render(<StorefrontReviewsEmpty variant="none" href="/loja/conta/pedidos" />)
    expect(screen.getByText("Quando um pedido for entregue, você avalia os produtos aqui.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ver meus pedidos" })).toHaveAttribute("href", "/loja/conta/pedidos")
  })

  it("says a list that could not be read failed, and offers to read it again", () => {
    render(<StorefrontReviewsEmpty variant="unavailable" href="/loja/conta/avaliacoes" />)
    expect(screen.getByRole("alert")).toHaveTextContent("Não deu para carregar suas avaliações agora.")
    expect(screen.getByRole("link", { name: "Tentar de novo" })).toHaveAttribute("href", "/loja/conta/avaliacoes")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontReviewsEmpty variant="none" href="#" />)
    await expectNoA11yViolations(container)
  })
})
