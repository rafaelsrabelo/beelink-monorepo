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

  // BEELINK-307: a category's banner sits between the trail and the title, the band's whole width.
  it("draws a banner between the trail and the title, on a row of its own", () => {
    render(
      <StorefrontResultsBand breadcrumb={<nav aria-label="Você está em">Início › Ferramentas</nav>} banner={<div data-testid="banner" />} heading="Ferramentas">
        <button type="button">Ordenar</button>
      </StorefrontResultsBand>,
    )

    const [trail, banner, heading] = [screen.getByRole("navigation"), screen.getByTestId("banner"), screen.getByRole("heading", { level: 1 })]
    expect(trail.compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(banner.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(banner.parentElement).toHaveClass("w-full")
    expect(screen.getAllByRole("navigation")).toHaveLength(1)
  })

  it("is drawn as it always was with no banner: the trail right over the title", () => {
    render(<StorefrontResultsBand breadcrumb={<nav aria-label="Você está em">Início › Tintas</nav>} heading="Tintas" />)

    expect(screen.getByRole("navigation").nextElementSibling).toContainElement(screen.getByRole("heading", { level: 1 }))
    expect(screen.getByRole("navigation").parentElement).toHaveClass("min-w-0", "gap-1")
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
