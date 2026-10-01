// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontReviewForm } from "./storefront-review-form"

const hidden = { acao: "criar", produto: "p-1", retorno: "/loja/conta/avaliacoes" }

describe("StorefrontReviewForm", () => {
  it("asks a rating out of five stars, in the eye's order, and a comment, as a plain form", async () => {
    const { container } = render(<StorefrontReviewForm action="/loja/api/customer/avaliacoes" hidden={hidden} idPrefix="p-1" productName="Produto" submitLabel="Enviar avaliação" />)

    const stars = screen.getAllByRole("radio")
    expect(stars.map((star) => star.getAttribute("value"))).toEqual(["1", "2", "3", "4", "5"])
    expect(screen.getByRole("group", { name: "Sua nota: Produto" })).toBeInTheDocument()
    expect(stars[0]).toBeRequired()

    await userEvent.click(screen.getByLabelText("4 estrelas"))
    await userEvent.type(screen.getByRole("textbox", { name: "Comentário (opcional)" }), "Muito bom")
    const form = container.querySelector("form")!
    expect(form).toHaveAttribute("method", "post")
    expect(Object.fromEntries(new FormData(form))).toEqual({ ...hidden, nota: "4", comentario: "Muito bom" })
  })

  it("starts from the rating and words already given, when editing", () => {
    render(<StorefrontReviewForm action="#" hidden={{ acao: "editar" }} idPrefix="r-1" productName="Produto" rating={2} comment="Chegou aberto." submitLabel="Salvar avaliação" />)

    expect(screen.getByLabelText("2 estrelas")).toBeChecked()
    expect(screen.getByRole("textbox", { name: "Comentário (opcional)" })).toHaveValue("Chegou aberto.")
    expect(screen.getByRole("button", { name: "Salvar avaliação" })).toHaveAttribute("type", "submit")
    expect(screen.getByLabelText("1 estrela")).toHaveAttribute("id", "r-1-nota-1")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontReviewForm action="#" hidden={hidden} idPrefix="p-1" productName="Produto" rating={3} submitLabel="Enviar avaliação" />)
    await expectNoA11yViolations(container)
  })
})
