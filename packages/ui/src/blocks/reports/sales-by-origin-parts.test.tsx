// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ReportPeriodPicker } from "./report-period-picker"
import { EXAMPLE_URL } from "./reports.fixtures"
import { SalesByOriginEmpty } from "./sales-by-origin-empty"
import { SalesByOriginNotes } from "./sales-by-origin-notes"
import { SalesByOriginSkeleton } from "./sales-by-origin-skeleton"

const options = [7, 30, 90].map((days) => ({ days, href: `/admin/loja/reports/origins?period=${days}` }))

describe("SalesByOriginEmpty", () => {
  it("says nothing was sold, and how a sale comes to have an origin, with a link to copy", async () => {
    const { container } = render(<SalesByOriginEmpty exampleUrl={EXAMPLE_URL} />)

    expect(screen.getByText("Nenhuma venda neste período.")).toBeInTheDocument()
    expect(screen.getByText(/os links dos seus anúncios e posts precisam levar utm_source, utm_medium e utm_campaign/)).toBeInTheDocument()
    // Text to copy, never a link out of the panel.
    expect(screen.getByText(EXAMPLE_URL).tagName).toBe("CODE")
    expect(screen.queryByRole("link")).toBeNull()
    await expectNoA11yViolations(container)
  })

  it("speaks the language it is handed", () => {
    render(<SalesByOriginEmpty exampleUrl={EXAMPLE_URL} messages={en} />)

    expect(screen.getByText("No sales in this period.")).toBeInTheDocument()
  })
})

describe("SalesByOriginNotes", () => {
  it("says which orders count, that older ones read as direct, that a click is a floor, and that spend and ROAS stay at Meta", async () => {
    const { container } = render(<SalesByOriginNotes />)

    const notes = within(screen.getByRole("region", { name: "Bom saber" }))
    expect(notes.getAllByRole("listitem").map((note) => note.textContent)).toEqual([
      "Conta como venda o pedido que não foi cancelado, no dia em que foi feito e pelo total do pedido. O pedido cobrado no site só conta depois de pago.",
      "Pedidos feitos antes de a loja guardar a origem contam como “Direto / sem campanha”.",
      "O clique em anúncio da Meta só é registrado de quem aceita os cookies da loja. O número de cliques é o mínimo, não o total.",
      "O gasto com anúncios e o retorno (ROAS) continuam na Meta: o bee-link não mostra o resultado dos anúncios.",
    ])
    await expectNoA11yViolations(container)
  })

  it("opens with how an origin gets recorded when it is handed the example", () => {
    render(<SalesByOriginNotes exampleUrl={EXAMPLE_URL} />)

    const first = screen.getAllByRole("listitem")[0]!
    expect(first).toHaveTextContent("Uma venda só aparece com a origem quando o link do anúncio ou do post leva utm_source, utm_medium e utm_campaign.")
    expect(within(first).getByText(EXAMPLE_URL)).toBeInTheDocument()
    expect(screen.getAllByRole("listitem")).toHaveLength(5)
  })
})

describe("ReportPeriodPicker", () => {
  it("offers each period as a link to the page's own address, and says which is on screen", async () => {
    const { container } = render(<ReportPeriodPicker options={options} current={30} />)

    const links = within(screen.getByRole("navigation", { name: "Período" })).getAllByRole("link")
    expect(links.map((link) => [link.textContent, link.getAttribute("href"), link.getAttribute("aria-current")])).toEqual([
      ["7 dias", "/admin/loja/reports/origins?period=7", null],
      ["30 dias", "/admin/loja/reports/origins?period=30", "true"],
      ["90 dias", "/admin/loja/reports/origins?period=90", null],
    ])
    await expectNoA11yViolations(container)
  })

  it("speaks the language it is handed", () => {
    render(<ReportPeriodPicker options={options} current={7} messages={en} />)

    expect(screen.getByRole("link", { name: "7 days" })).toHaveAttribute("aria-current", "true")
  })
})

describe("SalesByOriginSkeleton", () => {
  it("holds the table's place with nothing for a screen reader to read, and no spinner", () => {
    const { container } = render(<SalesByOriginSkeleton />)

    expect(screen.getByTestId("sales-by-origin-skeleton")).toHaveAttribute("aria-hidden", "true")
    expect(container.querySelector("[role=status], [role=progressbar], svg")).toBeNull()
    expect(container).toHaveTextContent("")
  })
})
