// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { awkwardSalesByOrigin, sampleSalesByOrigin, sampleSalesTotals } from "./reports.fixtures"
import { SalesByOriginCards } from "./sales-by-origin-cards"
import { SalesByOriginList } from "./sales-by-origin-list"

const CAPTION = "Vendas por origem, de 07/09/2026 a 06/10/2026"
const plain = (element: HTMLElement) => element.textContent?.replace(/\s/g, " ")

describe("SalesByOriginCards", () => {
  it("draws one card per origin with its three numbers named, and the total last", async () => {
    const { container } = render(<SalesByOriginCards rows={sampleSalesByOrigin} totals={sampleSalesTotals} caption={CAPTION} />)

    const cards = within(screen.getByRole("list", { name: CAPTION })).getAllByRole("listitem")
    expect(cards.map(plain)).toEqual([
      "facebook / cpc · campanha Black Friday5 de 12 pedidos com clique em anúncio da MetaPedidos12VendasR$ 2.500,00% das vendas62,5%",
      "Venda registrada no painelPedidos9VendasR$ 1.000,00% das vendas25%",
      "Direto / sem campanhaPedidos4VendasR$ 300,00% das vendas7,5%",
      "Anúncio da MetaPedidos2VendasR$ 150,00% das vendas3,8%",
      "instagram / socialPedidos1VendasR$ 50,00% das vendas1,3%",
      "TotalPedidos28VendasR$ 4.000,00% das vendas100%",
    ])
    expect(within(cards[0]!).getByText("Pedidos").tagName).toBe("DT")
    await expectNoA11yViolations(container)
  })

  it("draws a campaign's name as text, whole, breaking anywhere", () => {
    const { container } = render(<SalesByOriginCards rows={awkwardSalesByOrigin} totals={{ orders: 2, revenueCents: 11980 }} caption={CAPTION} />)

    expect(container.querySelector("img")).toBeNull()
    const long = `facebook / cpc · campanha ${"x".repeat(80)}`
    expect(screen.getByText(long)).toHaveClass("break-words")
    expect(screen.getByText(long).className).not.toMatch(/truncate|line-clamp/)
    expect(screen.getByText("newsletter / email · campanha <img src=x onerror=alert(1)>")).toBeInTheDocument()
  })
})

describe("SalesByOriginList", () => {
  it("holds the table and the cards, each shown where the other is hidden, by the width of the panel's main column", async () => {
    const { container } = render(<SalesByOriginList rows={sampleSalesByOrigin} totals={sampleSalesTotals} caption={CAPTION} />)

    expect(screen.getByRole("table", { name: CAPTION }).closest("div.hidden")).toHaveClass("@xl/main:block")
    expect(screen.getByRole("list", { name: CAPTION }).parentElement).toHaveClass("@xl/main:hidden")
    await expectNoA11yViolations(container)
  })
})
