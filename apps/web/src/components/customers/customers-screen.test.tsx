// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { StoreCustomer, StoreCustomerPage } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { ptBR as web } from "@/locales/pt-BR"
import { CustomersScreen } from "./customers-screen"

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  search: new URLSearchParams(),
  customers: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => mocks.search,
}))
vi.mock("@/services/customers/customer-hooks", () => ({ useStoreCustomers: mocks.customers }))
vi.mock("@/services/stores/store-hooks", () => ({ useStore: () => ({ data: { name: "Loja do Design" } }) }))

const customer = (over: Partial<StoreCustomer>): StoreCustomer => ({
  id: "c1",
  name: "Bia Souza",
  email: "bia@exemplo.com",
  emailVerified: true,
  phone: "5511977776666",
  city: "São Paulo",
  state: "SP",
  stage: "LEAD",
  ordersCount: 0,
  totalSpentCents: 0,
  lastOrderAt: null,
  daysSinceLastOrder: null,
  createdAt: "2026-09-01T10:00:00.000Z",
  ...over,
})

const page: StoreCustomerPage = {
  customers: [
    customer({}),
    customer({ id: "c2", name: "Eva Nunes", phone: "5511966665555", stage: "INACTIVE", ordersCount: 2, totalSpentCents: 12000, lastOrderAt: "2026-07-13T10:00:00.000Z", daysSinceLastOrder: 74 }),
  ],
  total: 2,
  page: 1,
  pageSize: 20,
  stageCounts: { LEAD: 12, CUSTOMER: 7, INACTIVE: 3 },
}

beforeEach(() => {
  mocks.search = new URLSearchParams()
  mocks.customers.mockReturnValue({ data: page, error: null, isPending: false, isFetching: false })
})

afterEach(() => {
  mocks.replace.mockReset()
  mocks.customers.mockReset()
})

function renderScreen() {
  return render(<CustomersScreen slug="loja" messages={ui} web={web} />)
}

describe("CustomersScreen", () => {
  it("asks the API for the tab, the order, the search and the page the address holds", () => {
    mocks.search = new URLSearchParams("stage=INACTIVE&sort=TOP_SPENT&q=eva&page=2")
    renderScreen()

    expect(mocks.customers).toHaveBeenCalledWith("loja", { stage: "INACTIVE", sort: "TOP_SPENT", q: "eva", page: 2 })
    expect(screen.getByRole("tab", { name: "Inativos 3" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("combobox", { name: "Ordenar por" })).toHaveTextContent("Maior gasto")
    expect(screen.getByRole("searchbox", { name: "Buscar clientes" })).toHaveValue("eva")
  })

  it("counts each tab from the API's answer, Todos being the sum", () => {
    renderScreen()

    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Todos 22", "Leads 12", "Clientes 7", "Inativos 3"])
  })

  it("writes a tab into the address and goes back to page one", async () => {
    mocks.search = new URLSearchParams("sort=MOST_ORDERS&page=3")
    renderScreen()

    await userEvent.click(screen.getByRole("tab", { name: "Leads 12" }))

    expect(mocks.replace).toHaveBeenCalledWith("/admin/loja/customers?stage=LEAD&sort=MOST_ORDERS")
  })

  it("opens each customer's record from the row", () => {
    renderScreen()

    for (const link of screen.getAllByRole("link", { name: "Abrir a ficha de Eva Nunes" })) {
      expect(link).toHaveAttribute("href", "/admin/loja/customers/c2")
    }
  })

  it("opens WhatsApp with the message for each customer's stage, from the shop", () => {
    renderScreen()
    const table = screen.getByRole("table")

    const lead = decodeURIComponent(within(table).getByRole("link", { name: "Chamar no WhatsApp: Bia Souza" }).getAttribute("href")!)
    expect(lead).toMatch(/^https:\/\/wa\.me\/5511977776666\?text=Olá, Bia! Aqui é da Loja do Design\./)
    expect(lead).toContain("ainda não fez o primeiro pedido")

    const inactive = decodeURIComponent(within(table).getByRole("link", { name: "Chamar no WhatsApp: Eva Nunes" }).getAttribute("href")!)
    expect(inactive).toContain("Faz tempo que você não passa aqui")
  })

  it("draws a skeleton while the first page is on its way", () => {
    mocks.customers.mockReturnValue({ data: undefined, error: null, isPending: true, isFetching: true })
    const { container } = renderScreen()

    expect(container.querySelectorAll("[data-slot=skeleton]").length).toBeGreaterThan(0)
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  // An error never tells a shop with customers that it has none.
  it("says what went wrong, and draws no empty list under it", () => {
    mocks.customers.mockReturnValue({ data: undefined, error: new Error("boom"), isPending: false, isFetching: false })
    renderScreen()

    expect(screen.getByRole("alert")).toHaveTextContent(web.errors.UNKNOWN)
    expect(screen.queryByText("Nenhum cliente ainda.")).not.toBeInTheDocument()
  })
})
