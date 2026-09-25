// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontResultsBand } from "./storefront-results-band"

describe("StorefrontResultsBand", () => {
  it("is the page's h1, with the trail above it and the count beside it", () => {
    render(
      <StorefrontResultsBand breadcrumb={<nav aria-label="Você está em">Início › Produtos</nav>} heading="Pré-treino" summary={<p>1–16 de 86 resultados</p>}>
        <button type="button">Ordenar</button>
      </StorefrontResultsBand>,
    )

    const heading = screen.getByRole("heading", { level: 1, name: "Pré-treino" })
    expect(screen.getByRole("navigation").compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(heading.parentElement).toContainElement(screen.getByText("1–16 de 86 resultados"))
    expect(screen.getByRole("button").parentElement).toHaveClass("ml-auto")
  })

  it("draws nothing at the far end when there is nothing to sort", () => {
    const { container } = render(<StorefrontResultsBand heading="Categorias" />)

    expect(container.querySelector(".ml-auto")).toBeNull()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontResultsBand heading="Pré-treino" summary={<p>86 resultados</p>} />)

    await expectNoA11yViolations(container)
  })
})
