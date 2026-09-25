// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCategoryFilter } from "./storefront-category-filter"

const entries = [
  { slug: "pote", label: "Pote", href: "/loja/pote", count: 38 },
  { slug: "dose-unica", label: "Dose única", href: "/loja/dose-unica", count: 1200 },
]

describe("StorefrontCategoryFilter", () => {
  it("on a category: the way back, the category bold and its children indented with counts", () => {
    render(<StorefrontCategoryFilter back={{ label: "Todos os produtos", href: "/loja/produtos" }} current="Pré-treino" entries={entries} locale="pt-BR" />)

    expect(screen.getByRole("link", { name: "‹ Todos os produtos" })).toHaveAttribute("href", "/loja/produtos")
    expect(screen.getByText("Pré-treino")).toHaveClass("font-bold")
    expect(screen.getByRole("link", { name: "Dose única (1.200)" })).toHaveAttribute("href", "/loja/dose-unica")
    expect(screen.getByRole("list")).toHaveClass("pl-5")
  })

  it("on the catalogue: the top level, the narrowed one marked", () => {
    render(<StorefrontCategoryFilter entries={[{ ...entries[0]!, selected: true }, entries[1]!]} locale="pt-BR" />)

    expect(screen.getByRole("link", { name: "Pote (38)" })).toHaveAttribute("aria-current", "true")
    expect(screen.getByRole("list")).not.toHaveClass("pl-5")
  })

  it("draws nothing when there is nowhere to go", () => {
    const { container } = render(<StorefrontCategoryFilter entries={[]} locale="pt-BR" />)

    expect(container).toBeEmptyDOMElement()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontCategoryFilter back={{ label: "Todos os produtos", href: "/loja/produtos" }} current="Pré-treino" entries={entries} locale="pt-BR" />)

    await expectNoA11yViolations(container)
  })
})
