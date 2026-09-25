// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontProductInfo } from "./storefront-product-info"

describe("StorefrontProductInfo", () => {
  it("puts the shop over the title, the title as the page's one h1, then what it is handed", () => {
    render(<StorefrontProductInfo shopName="Mutante Suplementos" homeHref="/mutante" name="Pré-Treino Haze" price={<p>R$ 119,90</p>} picker={<p>Sabor</p>} />)

    const shop = screen.getByRole("link", { name: "Visite a loja Mutante Suplementos" })
    const heading = screen.getByRole("heading", { level: 1, name: "Pré-Treino Haze" })
    expect(shop).toHaveAttribute("href", "/mutante")
    expect(shop.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(heading).toHaveClass("text-[26px]", "font-bold")
    expect(heading.compareDocumentPosition(screen.getByText("R$ 119,90")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("draws a hairline above the price, the choice and 'Sobre este item', in that order", () => {
    const { container } = render(
      <StorefrontProductInfo
        shopName="Loja"
        homeHref="/"
        name="Blusa"
       
        price={<p>R$ 119,90</p>}
        picker={<p>Sabor</p>}
        description={"Intro.\n\n- **Mais energia** no treino\n- Foco"}
      />,
    )

    const column = container.firstElementChild as HTMLElement
    const shape = [...column.children].map((child) => (child.getAttribute("aria-hidden") ? "|" : (child.textContent ?? "").slice(0, 8)))
    expect(shape).toEqual(["Visite a", "Blusa", "|", "R$ 119,9", "|", "Sabor", "|", "Sobre es"])
    expect(screen.getByRole("heading", { level: 2, name: "Sobre este item" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ver descrição completa" })).toHaveAttribute("href", "#descricao")
  })

  it("takes a part's hairline with it when the part is absent", () => {
    const { container } = render(<StorefrontProductInfo shopName="Loja" homeHref="/" name="Blusa" picker={<p>Sabor</p>} />)

    expect(container.querySelectorAll("[aria-hidden='true']")).toHaveLength(1)
  })

  it("has no 'Sobre este item' without a bulleted list, and no link when the list was all there was", () => {
    const { rerender } = render(<StorefrontProductInfo shopName="Loja" homeHref="/" name="Blusa" description={"Só um parágrafo.\n\n1. Passo"} />)
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument()

    rerender(<StorefrontProductInfo shopName="Loja" homeHref="/" name="Blusa" description={"- Mais energia\n- Foco"} />)
    expect(screen.getByRole("heading", { level: 2, name: "Sobre este item" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /descrição/ })).not.toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <StorefrontProductInfo shopName="Loja" homeHref="/" name="Blusa" price={<p>R$ 119,90</p>} description={"Intro.\n\n- **Mais energia**"} />,
    )

    await expectNoA11yViolations(container)
  })
})
