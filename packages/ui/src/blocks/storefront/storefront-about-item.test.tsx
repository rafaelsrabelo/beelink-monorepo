// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// UI
import { firstListOf } from "@harness-monorepo/ui/lib/markdown"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontAboutItem } from "./storefront-about-item"

const ITEMS = firstListOf("- **Mais energia** para treinos intensos.\n- **Foco total** no treino.\n- Sabor incrível.")

describe("StorefrontAboutItem", () => {
  it("draws each bullet with the bold lead the shopkeeper gave it", () => {
    render(<StorefrontAboutItem items={ITEMS} moreHref="#descricao" />)

    expect(screen.getByRole("heading", { level: 2, name: "Sobre este item" })).toBeInTheDocument()
    expect(screen.getAllByRole("listitem")).toHaveLength(3)
    expect(screen.getByText("Mais energia", { selector: "strong" })).toBeInTheDocument()
    expect(screen.getByText("Sabor incrível.")).toBeInTheDocument()
  })

  it("links down to the rest of the description, the arrow kept from the name", () => {
    render(<StorefrontAboutItem items={ITEMS} moreHref="#descricao" />)

    expect(screen.getByRole("link", { name: "Ver descrição completa" })).toHaveAttribute("href", "#descricao")
  })

  it("offers no link when the list was the whole description", () => {
    render(<StorefrontAboutItem items={ITEMS} />)

    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontAboutItem items={ITEMS} moreHref="#descricao" />)

    await expectNoA11yViolations(container)
  })
})
