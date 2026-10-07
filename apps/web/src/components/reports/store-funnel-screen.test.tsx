// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { StoreFunnelReport } from "@harness-monorepo/contracts"

// UI
import { en } from "@harness-monorepo/ui/locales/en"
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { StoreFunnelScreen } from "./store-funnel-screen"

const mocks = vi.hoisted(() => ({ search: new URLSearchParams(), report: vi.fn(), refetch: vi.fn() }))

vi.mock("next/navigation", () => ({ useSearchParams: () => mocks.search }))
vi.mock("@/services/reports/report-hooks", () => ({ useStoreFunnel: mocks.report }))

/** Noon in Brasília on 6 October. */
const NOW = new Date("2026-10-06T15:00:00.000Z")
const CAPTION = "Funil da loja, de 07/09/2026 a 06/10/2026"

const report: StoreFunnelReport = {
  from: "2026-09-07",
  to: "2026-10-06",
  steps: [
    { step: "PAGE_VIEW", count: 200 },
    { step: "PRODUCT_VIEW", count: 50 },
    { step: "ADD_TO_CART", count: 10 },
    { step: "CHECKOUT_START", count: 8 },
    { step: "PURCHASE", count: 2 },
  ],
  panelSales: 0,
  countingSince: "2026-08-01",
  retentionMonths: 13,
}

const read = (data: StoreFunnelReport | undefined, state: { isPending?: boolean; isError?: boolean } = {}) =>
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

const renderScreen = (messages = ui, locale: "pt-BR" | "en" = "pt-BR") => render(<StoreFunnelScreen slug="loja" locale={locale} messages={messages} />)
const stepsOf = (name = CAPTION) => within(screen.getByRole("list", { name })).getAllByRole("listitem").map((item) => [...item.querySelectorAll("p")].map((line) => line.textContent))
const notesOf = (name = "Bom saber") => within(screen.getByRole("region", { name })).getAllByRole("listitem").map((note) => note.textContent)

describe("StoreFunnelScreen", () => {
  it("draws the five steps in order with their counts, rates and drops, and the days the API answered with", () => {
    renderScreen()

    expect(screen.getByRole("heading", { level: 1, name: "Funil da loja" })).toBeInTheDocument()
    expect(screen.getByText("De 07/09/2026 a 06/10/2026")).toBeInTheDocument()
    expect(stepsOf()).toEqual([
      ["1. Visitas", "200", "Páginas da loja abertas"],
      ["2. Produto visto", "50", "Páginas de produto abertas", "25 a cada 100 visitas", "150 a menos que na etapa anterior"],
      ["3. Adição ao carrinho", "10", "Cliques em adicionar ao carrinho", "20 a cada 100 produtos vistos", "40 a menos que na etapa anterior"],
      ["4. Checkout iniciado", "8", "Chegadas ao carrinho com produto", "80 a cada 100 adições ao carrinho", "2 a menos que na etapa anterior"],
      ["5. Compra", "2", "Pedidos feitos no site que contam como venda", "25 a cada 100 checkouts iniciados", "6 a menos que na etapa anterior"],
    ])
  })

  it("reads thirty days ending today on a bare address, on the shop's clock", () => {
    renderScreen()

    expect(mocks.report).toHaveBeenLastCalledWith("loja", { from: "2026-09-07", to: "2026-10-06" })
    expect(screen.getByRole("link", { name: "30 dias" })).toHaveAttribute("aria-current", "true")
  })

  it("reads the period the address names, and offers the others as addresses of this page", () => {
    mocks.search = new URLSearchParams("period=90")
    renderScreen()

    expect(mocks.report).toHaveBeenLastCalledWith("loja", { from: "2026-07-09", to: "2026-10-06" })
    const links = within(screen.getByRole("navigation", { name: "Período" })).getAllByRole("link")
    expect(links.map((link) => [link.textContent, link.getAttribute("href"), link.getAttribute("aria-current")])).toEqual([
      ["7 dias", "/admin/loja/reports/funnel?period=7", null],
      ["30 dias", "/admin/loja/reports/funnel", null],
      ["90 dias", "/admin/loja/reports/funnel?period=90", "true"],
    ])
  })

  it("reads a period it cannot mean as thirty days", () => {
    mocks.search = new URLSearchParams("period=3650&from=2000-01-01")
    renderScreen()

    expect(mocks.report).toHaveBeenLastCalledWith("loja", { from: "2026-09-07", to: "2026-10-06" })
  })

  it("holds the steps' place with a skeleton while it reads — no spinner, no list, no days", () => {
    read(undefined, { isPending: true })
    renderScreen()

    expect(screen.getByTestId("store-funnel-skeleton")).toBeInTheDocument()
    expect(screen.queryByRole("list", { name: CAPTION })).toBeNull()
    expect(screen.queryByText(/^De /)).toBeNull()
    expect(screen.queryByRole("status")).toBeNull()
    // The periods and the notes are there meanwhile, the retention among them.
    expect(screen.getByRole("navigation", { name: "Período" })).toBeInTheDocument()
    expect(notesOf().at(-1)).toBe("Os números de cada dia ficam guardados por 13 meses e depois são apagados.")
  })

  it("says a period with no visit counted is empty — whatever the orders say — and still shows the notes", () => {
    read({ ...report, steps: report.steps.map((step) => ({ ...step, count: step.step === "PURCHASE" ? 3 : 0 })), countingSince: null })
    renderScreen()

    expect(screen.getByText("Nenhuma visita contada neste período.")).toBeInTheDocument()
    expect(screen.queryByRole("list", { name: CAPTION })).toBeNull()
    expect(notesOf()).toHaveLength(7)
  })

  it("says, in plain words, that steps count events, that purchases are real orders, that nobody is identified, and for how long days are kept", () => {
    renderScreen()

    const notes = notesOf()
    expect(notes[0]).toMatch(/^As etapas contam eventos, não pessoas: quem abre cinco produtos conta cinco vezes\./)
    expect(notes[2]).toMatch(/pela mesma regra de “Vendas por origem”/)
    expect(notes[3]).toMatch(/^Nada aqui identifica quem visitou\. A loja guarda só um número por dia e por etapa, sem cookie/)
    expect(notes[5]).toBe("A contagem começou quando o funil foi lançado: os dias anteriores aparecem zerados.")
    expect(notes[6]).toBe("Os números de cada dia ficam guardados por 13 meses e depois são apagados.")
  })

  it("says the first counted day when it falls inside the period, and not when the whole period was counted", () => {
    renderScreen()
    expect(screen.queryByText(/A contagem desta loja começou/)).toBeNull()

    read({ ...report, countingSince: "2026-10-01" })
    renderScreen()
    expect(screen.getByText(/^A contagem desta loja começou em 01\/10\/2026\./)).toBeInTheDocument()
  })

  it("says how many sales registered in the panel stayed out of the funnel", () => {
    read({ ...report, panelSales: 4 })
    renderScreen()

    expect(screen.getByText("4 vendas registradas no painel nestes dias ficaram fora do funil: não passaram pelo site.")).toBeInTheDocument()
  })

  it("says the retention the API answers with", () => {
    read({ ...report, retentionMonths: 6 })
    renderScreen()

    expect(notesOf().at(-1)).toBe("Os números de cada dia ficam guardados por 6 meses e depois são apagados.")
  })

  it("says the read failed and reads again when asked", async () => {
    vi.useRealTimers()
    read(undefined, { isError: true })
    renderScreen()

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar o funil da loja.")
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))

    expect(mocks.refetch).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("list", { name: CAPTION })).toBeNull()
  })

  it("speaks English when handed English", () => {
    renderScreen(en, "en")

    expect(screen.getByRole("heading", { level: 1, name: "Shop funnel" })).toBeInTheDocument()
    expect(screen.getByText("From 09/07/2026 to 10/06/2026")).toBeInTheDocument()
    expect(stepsOf("Shop funnel, from 09/07/2026 to 10/06/2026")[4]).toEqual(["5. Purchase", "2", "Orders placed on the site that count as a sale", "25 per 100 checkouts started", "6 fewer than the step before"])
    expect(notesOf("Good to know")).toHaveLength(7)
  })
})
