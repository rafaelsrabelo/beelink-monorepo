// Libs
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCart } from "./storefront-cart"
import type { StorefrontCartRow } from "./storefront-cart-line"

const rows: StorefrontCartRow[] = [
  { key: "whey", name: "Whey", href: "/loja/produtos/whey", variantLabel: "Sabor: Chocolate · Peso: 900 g", imageUrl: null, unitPriceCents: 8990, qty: 2, lineTotalCents: 17980, available: true },
  { key: "uva", name: "Whey Uva", href: "/loja/produtos/whey", variantLabel: "Sabor: Uva", imageUrl: null, unitPriceCents: 8990, qty: 1, lineTotalCents: 8990, available: false },
]

const money = (text: string | null) => text?.replace(/\s/g, " ")

describe("StorefrontCart", () => {
  it("lists each line with its combination and total, and sums what can be ordered", () => {
    render(<StorefrontCart rows={rows} subtotalCents={17980} count={2} locale="pt-BR" continueHref="/loja/produtos" />)

    expect(screen.getByRole("link", { name: "Whey" })).toHaveAttribute("href", "/loja/produtos/whey")
    expect(screen.getByText("Sabor: Chocolate · Peso: 900 g")).toBeInTheDocument()
    expect(screen.getByText("Esgotado — não entra no pedido")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2, name: "Resumo do pedido" })).toBeInTheDocument()
    expect(screen.getByText(/Subtotal \(2 itens\)/)).toBeInTheDocument()
    expect(money(screen.getByText(/^R\$\s179,80$/, { selector: "dd" }).textContent)).toBe("R$ 179,80")
  })

  it("asks for a new quantity and for a line to go, by the line's key", () => {
    const onQtyChange = vi.fn()
    const onRemove = vi.fn()
    render(<StorefrontCart rows={rows} subtotalCents={17980} count={2} locale="pt-BR" continueHref="/loja/produtos" onQtyChange={onQtyChange} onRemove={onRemove} />)

    fireEvent.click(screen.getByRole("button", { name: "Aumentar a quantidade de Whey" }))
    fireEvent.click(screen.getByRole("button", { name: "Diminuir a quantidade de Whey" }))
    fireEvent.click(screen.getByRole("button", { name: "Remover Whey Uva do carrinho" }))

    expect(onQtyChange.mock.calls).toEqual([
      ["whey", 3],
      ["whey", 1],
    ])
    expect(onRemove).toHaveBeenCalledWith("uva")
    expect(screen.getByRole("button", { name: "Aumentar a quantidade de Whey Uva" })).toBeDisabled()
  })

  it("is a sentence and a way back when empty, saying what it took out", () => {
    render(<StorefrontCart rows={[]} subtotalCents={0} count={0} locale="pt-BR" continueHref="/loja/produtos" notice="Um produto saiu." />)

    expect(screen.getByText("Seu carrinho está vazio.")).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("Um produto saiu.")
    expect(screen.getByRole("link", { name: "Continuar comprando" })).toHaveAttribute("href", "/loja/produtos")
  })

  it("draws the way to close the order it is given, under the subtotal", () => {
    render(<StorefrontCart rows={rows} subtotalCents={17980} count={2} locale="pt-BR" continueHref="#" checkout={<a href="#fechar">Fechar pedido</a>} />)

    expect(screen.getByRole("complementary")).toContainElement(screen.getByRole("link", { name: "Fechar pedido" }))
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontCart rows={rows} subtotalCents={17980} count={2} locale="pt-BR" continueHref="/loja/produtos" />)

    await expectNoA11yViolations(container)
  })
})
