// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontReviewsSection } from "./storefront-reviews-section"

describe("StorefrontReviewsSection", () => {
  it("heads its cards with a title and the line under it", () => {
    render(
      <StorefrontReviewsSection title="Para avaliar" hint="Sua nota ajuda outros clientes.">
        <p>card</p>
      </StorefrontReviewsSection>,
    )
    expect(screen.getByRole("heading", { level: 2, name: "Para avaliar" })).toBeInTheDocument()
    expect(screen.getByText("Sua nota ajuda outros clientes.")).toBeInTheDocument()
    expect(screen.getByText("card")).toBeInTheDocument()
  })

  it("puts the way to the rest beside the title", () => {
    render(<StorefrontReviewsSection title="Avalie suas compras" aside={<a href="/loja/conta/avaliacoes">Ver todos (6)</a>} />)
    expect(screen.getByRole("link", { name: "Ver todos (6)" })).toHaveAttribute("href", "/loja/conta/avaliacoes")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontReviewsSection title="Suas avaliações" />)
    await expectNoA11yViolations(container)
  })
})
