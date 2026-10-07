// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { awkwardSalesByOrigin, sampleSalesByOrigin, sampleSalesTotals } from "./reports.fixtures"
import { SalesByOriginTable } from "./sales-by-origin-table"

const CAPTION = "Vendas por origem, de 07/09/2026 a 06/10/2026"
/** A cell's text with its spaces made plain: the currency is written with a no-break space. */
const cellsOf = (row: HTMLElement) => within(row).getAllByRole("cell").map((cell) => cell.textContent?.replace(/\s/g, " "))

describe("SalesByOriginTable", () => {
  it("draws one line per origin, in the order given, in the words an order's page uses", async () => {
    const { container } = render(<SalesByOriginTable rows={sampleSalesByOrigin} totals={sampleSalesTotals} caption={CAPTION} />)

    const table = screen.getByRole("table", { name: CAPTION })
    expect(within(table).getAllByRole("columnheader").map((head) => head.textContent)).toEqual(["Origem", "Pedidos", "Vendas", "% das vendas"])
    expect(within(table).getAllByRole("rowheader").map((head) => head.textContent)).toEqual([
      "facebook / cpc · campanha Black Friday5 de 12 pedidos com clique em anúncio da Meta",
      "Venda registrada no painel",
      "Direto / sem campanha",
      "Anúncio da Meta",
      "instagram / social",
      "Total",
    ])
    await expectNoA11yViolations(container)
  })

  it("says each line's orders, sales and part of the period's sales, and the total under them", () => {
    render(<SalesByOriginTable rows={sampleSalesByOrigin} totals={sampleSalesTotals} caption={CAPTION} />)

    const rows = screen.getAllByRole("row")
    expect(cellsOf(rows[1]!)).toEqual(["12", "R$ 2.500,00", "62,5%"])
    expect(cellsOf(rows[2]!)).toEqual(["9", "R$ 1.000,00", "25%"])
    expect(cellsOf(rows[5]!)).toEqual(["1", "R$ 50,00", "1,3%"])
    expect(cellsOf(rows.at(-1)!)).toEqual(["28", "R$ 4.000,00", "100%"])
  })

  it("draws a campaign's name as text, never as markup, with the whole of it in the title", () => {
    const { container } = render(<SalesByOriginTable rows={awkwardSalesByOrigin} totals={{ orders: 2, revenueCents: 11980 }} caption={CAPTION} />)

    expect(container.querySelector("img")).toBeNull()
    expect(screen.getByText("newsletter / email · campanha <img src=x onerror=alert(1)>")).toBeInTheDocument()
    const long = `facebook / cpc · campanha ${"x".repeat(80)}`
    expect(screen.getByText(long)).toHaveAttribute("title", long)
    expect(screen.getByText(long)).toHaveClass("line-clamp-2", "break-words")
  })

  it("says no share where nothing was sold for money", () => {
    render(<SalesByOriginTable rows={[{ kind: "DIRECT", source: null, medium: null, campaign: null, orders: 1, metaAdOrders: 0, revenueCents: 0 }]} totals={{ orders: 1, revenueCents: 0 }} caption={CAPTION} />)

    expect(cellsOf(screen.getAllByRole("row")[1]!)).toEqual(["1", "R$ 0,00", "—"])
  })

  it("speaks the language it is handed", () => {
    render(<SalesByOriginTable rows={sampleSalesByOrigin} totals={sampleSalesTotals} caption="Sales by origin" locale="en" messages={en} />)

    expect(screen.getAllByRole("columnheader").map((head) => head.textContent)).toEqual(["Origin", "Orders", "Sales", "% of sales"])
    expect(screen.getByRole("rowheader", { name: /facebook \/ cpc · campaign Black Friday/ })).toHaveTextContent("5 of 12 orders with a Meta ad click")
    expect(screen.getByRole("rowheader", { name: "Sale registered in the panel" })).toBeInTheDocument()
    expect(screen.getByRole("rowheader", { name: "Direct / no campaign" })).toBeInTheDocument()
  })
})
