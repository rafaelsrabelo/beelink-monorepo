// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontRichText } from "./storefront-rich-text"

const whey = [
  "**100% Whey Protein Concentrado**",
  "",
  "Com alto teor de proteína, é ideal para quem busca _praticidade_.",
  "",
  "🥛 **Destaques do produto**",
  "",
  "- Proteína de alta qualidade",
  "",
  "- Fácil e rápido de preparar",
  "",
  "**Modo de consumo:** misture com água. [Saiba mais](https://bee.link/whey)",
].join("\n")

describe("StorefrontRichText", () => {
  it("draws the formatting instead of printing the marks", () => {
    const { container } = render(<StorefrontRichText markdown={whey} />)

    expect(container.textContent).not.toContain("**")
    expect(container.textContent).not.toContain("- ")
    expect(container.querySelectorAll("strong")).toHaveLength(3)
    expect(container.querySelector("em")).toHaveTextContent("praticidade")
    expect(screen.getByRole("link", { name: "Saiba mais" })).toHaveAttribute("href", "https://bee.link/whey")
  })

  it("makes one list of items a blank line kept apart", () => {
    const { container } = render(<StorefrontRichText markdown={whey} />)

    expect(container.querySelectorAll("ul")).toHaveLength(1)
    expect(screen.getAllByRole("listitem")).toHaveLength(2)
  })

  it("never turns stored text into an element", () => {
    const { container } = render(<StorefrontRichText markdown={"<script>alert(1)</script> e <b>x</b>"} />)

    expect(container.querySelector("script, b")).toBeNull()
    expect(container.textContent).toContain("<script>alert(1)</script>")
  })

  it("leaves out the first bulleted list when 'Sobre este item' already drew it, and nothing else", () => {
    const { container } = render(<StorefrontRichText markdown={"Intro.\n\n- Destaque\n\n1. Passo\n\n- Outra lista"} skipFirstList />)

    expect(container).not.toHaveTextContent("Destaque")
    expect(container.querySelector("ol")).toHaveTextContent("Passo")
    expect(container.querySelector("ul")).toHaveTextContent("Outra lista")
  })

  it("draws nothing for an empty description", () => {
    const { container } = render(<StorefrontRichText markdown={"  \n\n "} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontRichText markdown={whey} />)

    await expectNoA11yViolations(container)
  })
})
