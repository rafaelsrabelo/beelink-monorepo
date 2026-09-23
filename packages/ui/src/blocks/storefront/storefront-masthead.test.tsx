// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontMasthead } from "./storefront-masthead"

describe("StorefrontMasthead", () => {
  it("draws a site's button apart from its menu", () => {
    render(
      <StorefrontMasthead
        name="Asfalto Norte"
        homeHref="/asfalto-norte"
        menu={[{ id: "s", label: "Serviços", href: "#servicos" }]}
        cta={{ label: "Pedir orçamento", href: "#contato" }}
      />,
    )

    const menu = screen.getByRole("navigation", { name: "Seções do site" })
    expect(within(menu).queryByRole("link", { name: "Pedir orçamento" })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Pedir orçamento" })).toHaveAttribute("href", "#contato")
  })

  it("draws no button when there is none", () => {
    render(<StorefrontMasthead name="Lessari" homeHref="/lessari" />)

    expect(screen.getAllByRole("link")).toHaveLength(1)
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <StorefrontMasthead name="Asfalto Norte" homeHref="/a" cta={{ label: "Pedir orçamento", href: "#contato" }} />,
    )

    await expectNoA11yViolations(container)
  })
})
