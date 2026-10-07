// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { SalesByOriginReport } from "@harness-monorepo/contracts"

// UI
import { en } from "@harness-monorepo/ui/locales/en"
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { SalesByOriginScreen } from "./sales-by-origin-screen"

const mocks = vi.hoisted(() => ({ search: new URLSearchParams(), report: vi.fn(), refetch: vi.fn() }))

vi.mock("next/navigation", () => ({ useSearchParams: () => mocks.search }))
vi.mock("@/services/reports/report-hooks", () => ({ useSalesByOrigin: mocks.report }))

const EXAMPLE = "https://beelink.biz/loja?utm_source=instagram&utm_medium=social&utm_campaign=minha-campanha"
/** Noon in Brasília on 6 October. */
const NOW = new Date("2026-10-06T15:00:00.000Z")

const report: SalesByOriginReport = {
  from: "2026-09-07",
  to: "2026-10-06",
  rows: [
    { kind: "CAMPAIGN", source: "facebook", medium: "cpc", campaign: "teste", orders: 3, metaAdOrders: 1, revenueCents: 30000 },
    { kind: "PANEL", source: null, medium: null, campaign: null, orders: 2, metaAdOrders: 0, revenueCents: 7500 },
    { kind: "DIRECT", source: null, medium: null, campaign: null, orders: 1, metaAdOrders: 0, revenueCents: 2500 },
  ],
  totals: { orders: 6, revenueCents: 40000 },
}

const read = (data: SalesByOriginReport | undefined, state: { isPending?: boolean; isError?: boolean } = {}) =>
  mocks.report.mockReturnValue({ data, isPending: state.isPending ?? false, isError: state.isError ?? false, refetch: mocks.refetch })

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
  mocks.search = new URLSearchParams()
  read(report)
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

const renderScreen = (messages = ui, locale: "pt-BR" | "en" = "pt-BR") => render(<SalesByOriginScreen slug="loja" locale={locale} exampleUrl={EXAMPLE} messages={messages} />)
const rowsOf = () => within(screen.getByRole("table")).getAllByRole("row").map((row) => row.textContent?.replace(/\s/g, " "))

describe("SalesByOriginScreen", () => {
  it("draws the period's sales by origin with their share, the total, and the days the API answered with", () => {
    renderScreen()

    expect(screen.getByRole("heading", { level: 1, name: "Vendas por origem" })).toBeInTheDocument()
    expect(screen.getByText("De 07/09/2026 a 06/10/2026")).toBeInTheDocument()
    expect(screen.getByRole("table", { name: "Vendas por origem, de 07/09/2026 a 06/10/2026" })).toBeInTheDocument()
    expect(rowsOf()).toEqual([
      "OrigemPedidosVendas% das vendas",
      "facebook / cpc · campanha teste1 de 3 pedidos com clique em anúncio da Meta3R$ 300,0075%",
      "Venda registrada no painel2R$ 75,0018,8%",
      "Direto / sem campanha1R$ 25,006,3%",
      "Total6R$ 400,00100%",
    ])
  })

  it("reads thirty days ending today on a bare address, on the shop's clock", () => {
    renderScreen()

    expect(mocks.report).toHaveBeenLastCalledWith("loja", { from: "2026-09-07", to: "2026-10-06" })
    expect(screen.getByRole("link", { name: "30 dias" })).toHaveAttribute("aria-current", "true")
  })

  it("reads the period the address names, and offers the others as addresses", () => {
    mocks.search = new URLSearchParams("period=7")
    renderScreen()

    expect(mocks.report).toHaveBeenLastCalledWith("loja", { from: "2026-09-30", to: "2026-10-06" })
    const links = within(screen.getByRole("navigation", { name: "Período" })).getAllByRole("link")
    expect(links.map((link) => [link.textContent, link.getAttribute("href"), link.getAttribute("aria-current")])).toEqual([
      ["7 dias", "/admin/loja/reports/origins?period=7", "true"],
      ["30 dias", "/admin/loja/reports/origins", null],
      ["90 dias", "/admin/loja/reports/origins?period=90", null],
    ])
  })

  it("reads a period it cannot mean as thirty days, and asks the API for nothing else", () => {
    mocks.search = new URLSearchParams("period=3650&from=2000-01-01")
    renderScreen()

    expect(mocks.report).toHaveBeenLastCalledWith("loja", { from: "2026-09-07", to: "2026-10-06" })
  })

  it("holds the table's place with a skeleton while it reads — no spinner, no table, no days", () => {
    read(undefined, { isPending: true })
    renderScreen()

    expect(screen.getByTestId("sales-by-origin-skeleton")).toBeInTheDocument()
    expect(screen.queryByRole("table")).toBeNull()
    expect(screen.queryByText(/^De /)).toBeNull()
    expect(screen.queryByRole("status")).toBeNull()
    // The periods and the notes are there meanwhile.
    expect(screen.getByRole("navigation", { name: "Período" })).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Bom saber" })).toBeInTheDocument()
  })

  it("says a period with no sale is empty, and how an origin gets recorded, with the shop's own address — once", () => {
    read({ ...report, rows: [], totals: { orders: 0, revenueCents: 0 } })
    renderScreen()

    expect(screen.getByText("Nenhuma venda neste período.")).toBeInTheDocument()
    expect(screen.getByText(/precisam levar utm_source, utm_medium e utm_campaign/)).toBeInTheDocument()
    expect(screen.getAllByText(EXAMPLE)).toHaveLength(1)
    expect(screen.queryByRole("table")).toBeNull()
    expect(within(screen.getByRole("region", { name: "Bom saber" })).getAllByRole("listitem")).toHaveLength(4)
  })

  it("says under the table how an origin gets recorded, that older orders read as direct, and that spend and ROAS stay at Meta", () => {
    renderScreen()

    const notes = within(screen.getByRole("region", { name: "Bom saber" })).getAllByRole("listitem")
    expect(notes).toHaveLength(5)
    expect(notes[0]).toHaveTextContent(EXAMPLE)
    expect(notes[2]).toHaveTextContent("Pedidos feitos antes de a loja guardar a origem contam como “Direto / sem campanha”.")
    expect(notes[4]).toHaveTextContent("O gasto com anúncios e o retorno (ROAS) continuam na Meta: o bee-link não mostra o resultado dos anúncios.")
  })

  it("says the read failed and reads again when asked", async () => {
    vi.useRealTimers()
    read(undefined, { isError: true })
    renderScreen()

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar as vendas por origem.")
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))

    expect(mocks.refetch).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("table")).toBeNull()
  })

  it("draws a campaign's name as text", () => {
    read({ ...report, rows: [{ kind: "CAMPAIGN", source: "x", medium: null, campaign: "<img src=x onerror=alert(1)>", orders: 1, metaAdOrders: 0, revenueCents: 100 }], totals: { orders: 1, revenueCents: 100 } })
    const { container } = renderScreen()

    expect(container.querySelector("img")).toBeNull()
    expect(screen.getByText("x · campanha <img src=x onerror=alert(1)>")).toBeInTheDocument()
  })

  it("speaks English when handed English", () => {
    renderScreen(en, "en")

    expect(screen.getByRole("heading", { level: 1, name: "Sales by origin" })).toBeInTheDocument()
    expect(screen.getByText("From 09/07/2026 to 10/06/2026")).toBeInTheDocument()
    expect(rowsOf()[2]).toBe("Sale registered in the panel2R$75.0018.8%")
  })
})
