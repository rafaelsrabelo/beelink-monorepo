// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontQuickRating } from "./storefront-quick-rating"

const hidden = { acao: "criar", produto: "p1", retorno: "/loja/conta" }

describe("StorefrontQuickRating", () => {
  it("sends the rating a star carries in one tap, with what the form carries along", () => {
    const { container } = render(<StorefrontQuickRating action="/loja/api/customer/avaliacoes" hidden={hidden} productName="Creatina 300g" />)

    const group = screen.getByRole("group", { name: "Dar nota a Creatina 300g" })
    expect(group).toBeInTheDocument()
    const four = screen.getByRole("button", { name: "4 estrelas" })
    expect(four).toHaveAttribute("type", "submit")
    expect(four).toHaveAttribute("name", "nota")
    expect(four).toHaveAttribute("value", "4")
    expect(screen.getByRole("button", { name: "1 estrela" })).toHaveAttribute("value", "1")
    const form = container.querySelector("form")!
    expect(form).toHaveAttribute("action", "/loja/api/customer/avaliacoes")
    expect(form).toHaveAttribute("method", "post")
    expect(form.querySelector('input[name="produto"]')).toHaveValue("p1")
    expect(form.querySelector('input[name="retorno"]')).toHaveValue("/loja/conta")
    expect(form.querySelector("textarea")).toBeNull()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontQuickRating action="#" hidden={hidden} productName="Creatina 300g" />)
    await expectNoA11yViolations(container)
  })
})
