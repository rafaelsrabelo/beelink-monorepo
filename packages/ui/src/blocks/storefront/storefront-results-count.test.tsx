// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontResultsCount, rangeOf } from "./storefront-results-count"

describe("StorefrontResultsCount", () => {
  it("counts positions in the whole list, from the page the API answered", () => {
    expect(rangeOf(1, 16, 86)).toEqual({ from: 1, to: 16 })
    expect(rangeOf(6, 16, 86)).toEqual({ from: 81, to: 86 })
  })

  it("writes the range and the term as 5a does, the term bold in the promotion colour", () => {
    render(<StorefrontResultsCount page={1} pageSize={16} total={86} term="pré-treino" locale="pt-BR" />)

    expect(screen.getByText(/1–16 de 86 resultados para/)).toBeInTheDocument()
    expect(screen.getByText('"pré-treino"')).toHaveClass("text-shop-sale-ink")
  })

  it("says one and none in words, and groups thousands in the shopper's language", () => {
    const { rerender } = render(<StorefrontResultsCount page={1} pageSize={16} total={1} locale="pt-BR" />)
    expect(screen.getByText("1 resultado")).toBeInTheDocument()

    rerender(<StorefrontResultsCount page={1} pageSize={16} total={0} term="xyz" locale="pt-BR" />)
    expect(screen.getByText(/Nenhum resultado para/)).toBeInTheDocument()

    rerender(<StorefrontResultsCount page={2} pageSize={16} total={1200} locale="pt-BR" />)
    expect(screen.getByText("17–32 de 1.200 resultados")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontResultsCount page={1} pageSize={16} total={86} term="whey" locale="pt-BR" />)

    await expectNoA11yViolations(container)
  })
})
