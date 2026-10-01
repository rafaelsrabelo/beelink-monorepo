// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontReviewCard } from "./storefront-review-card"

const form = <form aria-label="Avaliar Whey" />

describe("StorefrontReviewCard", () => {
  it("shows what arrived with the form right there, under the anchor a delivered order leads to", () => {
    const { container } = render(<StorefrontReviewCard id="avaliar-p-1" name="Whey" href="/loja/produtos/whey" imageUrl={null} meta="Entregue em 12 set · Sabor: Uva" form={form} />)

    expect(container.querySelector("article")).toHaveAttribute("id", "avaliar-p-1")
    expect(screen.getByRole("link", { name: "Whey" })).toHaveAttribute("href", "/loja/produtos/whey")
    expect(screen.getByText("Entregue em 12 set · Sabor: Uva")).toBeInTheDocument()
    expect(screen.getByRole("form", { name: "Avaliar Whey" })).toBeVisible()
    expect(screen.queryByText("Editar avaliação")).not.toBeInTheDocument()
  })

  it("reads a review sent as one sentence, says the shop hid it, and keeps its edit behind a summary", () => {
    const { rerender, container } = render(<StorefrontReviewCard id="avaliar-p-1" name="Whey" href={null} imageUrl={null} meta={null} rating={4} comment="Bom." hidden form={form} />)

    expect(screen.getByText("Nota 4 de 5")).toBeInTheDocument()
    expect(screen.getByText("Bom.")).toBeInTheDocument()
    expect(screen.getByText("Oculta pela loja: só você vê esta avaliação.")).toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
    expect(container.querySelector("details")).not.toHaveAttribute("open")

    rerender(<StorefrontReviewCard id="avaliar-p-1" name="Whey" href={null} imageUrl={null} meta={null} rating={4} form={form} open />)
    expect(container.querySelector("details")).toHaveAttribute("open")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontReviewCard id="a" name="Whey" href="#" imageUrl={null} meta="Sabor: Uva" rating={5} comment="Ótimo." form={form} />)
    await expectNoA11yViolations(container)
  })
})
