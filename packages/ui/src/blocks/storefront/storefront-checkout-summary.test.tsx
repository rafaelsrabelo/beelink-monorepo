// Libs
import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import type { StorefrontCartRow } from "./storefront-cart-line"
import { StorefrontCheckoutSummary } from "./storefront-checkout-summary"

const rows: StorefrontCartRow[] = [
  { key: "whey", name: "Whey", href: "/loja/carrinho", variantLabel: "Sabor: Chocolate", imageUrl: null, unitPriceCents: 8990, qty: 2, lineTotalCents: 16182, wasCents: 17980, promotion: "Semana do Whey", available: true },
  { key: "uva", name: "Creatina", href: "/loja/carrinho", variantLabel: null, imageUrl: null, unitPriceCents: 5990, qty: 1, lineTotalCents: 5990, available: false },
]

function renderSummary() {
  return render(
    <StorefrontCheckoutSummary rows={rows} count={2} amount="R$ 161,82" editHref="/loja/carrinho?cupom=BEMVINDO10" locale="pt-BR">
      <p>Os valores</p>
    </StorefrontCheckoutSummary>,
  )
}

describe("StorefrontCheckoutSummary", () => {
  it("is one line on a phone — how many, and what it comes to — that opens to show the lines", () => {
    renderSummary()
    const toggle = screen.getByRole("button", { name: /Resumo \(2\)/ })

    expect(toggle).toHaveTextContent("R$ 161,82")
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute("aria-expanded", "true")
    expect(document.getElementById(toggle.getAttribute("aria-controls")!)).toHaveClass("flex")
  })

  it("reads each line — its combination, how many, what it costs and what it cost before — and changes none", () => {
    renderSummary()
    const whey = within(screen.getByRole("region", { name: "Resumo do pedido" })).getByText("Whey").closest("li")!

    expect(whey).toHaveTextContent("Sabor: Chocolate")
    expect(whey).toHaveTextContent("Qtd.: 2")
    expect(whey).toHaveTextContent("Promoção: Semana do Whey")
    expect(whey.querySelector("s")!.textContent!.replace(/\s/g, " ")).toBe("De: R$ 179,80")
    expect(screen.getByText("Creatina").closest("li")).toHaveTextContent("Esgotado — não entra no pedido")
    expect(screen.queryByRole("button", { name: /quantidade/ })).toBeNull()
    expect(screen.getByRole("link", { name: "Editar carrinho" })).toHaveAttribute("href", "/loja/carrinho?cupom=BEMVINDO10")
    expect(screen.getByText("Os valores")).toBeInTheDocument()
  })

  it("waits as a skeleton for the amount on its closed line", () => {
    render(
      <StorefrontCheckoutSummary rows={rows} count={2} amount="R$ 161,82" pricing editHref="#" locale="pt-BR">
        <p>Os valores</p>
      </StorefrontCheckoutSummary>,
    )

    expect(screen.getByRole("button", { name: /Resumo \(2\)/ })).not.toHaveTextContent("R$")
  })

  it("has no accessibility violations, closed or open", async () => {
    const { container } = renderSummary()
    await expectNoA11yViolations(container)

    fireEvent.click(screen.getByRole("button", { name: /Resumo \(2\)/ }))
    await expectNoA11yViolations(container)
  })
})
