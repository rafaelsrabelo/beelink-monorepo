// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { OrderPage, StoreCustomerDetail } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { ptBR as web } from "@/locales/pt-BR"
import { CustomerRequestError } from "@/services/customers/customer-requests"
import { CustomerScreen } from "./customer-screen"
import { correctionOf, historyPageOf } from "./use-customer-record"

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  search: new URLSearchParams(),
  record: vi.fn(),
  orders: vi.fn(),
  update: vi.fn(),
  mutate: vi.fn(),
  reset: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => mocks.search,
}))
vi.mock("@/services/customers/customer-hooks", () => ({ useStoreCustomer: mocks.record }))
vi.mock("@/services/customers/customer-record-hooks", () => ({ useUpdateStoreCustomer: mocks.update }))
vi.mock("@/services/orders/order-hooks", () => ({ useOrders: mocks.orders }))
vi.mock("@/services/stores/store-hooks", () => ({ useStore: () => ({ data: { name: "Loja do Design" } }) }))

const ID = "0199aaaa-bbbb-7ccc-8ddd-eeeeffff0001"

const caio: StoreCustomerDetail = {
  id: ID,
  name: "Caio Lima",
  email: null,
  emailVerified: false,
  phone: "5511955554444",
  city: "Campinas",
  state: "SP",
  stage: "CUSTOMER",
  ordersCount: 3,
  totalSpentCents: 36870,
  lastOrderAt: "2026-09-20T14:30:00.000Z",
  daysSinceLastOrder: 5,
  createdAt: "2026-06-02T12:00:00.000Z",
  address: { zipCode: "13015-904", street: "Rua Barão de Jaguara", number: "1000", complement: null, neighborhood: "Centro", city: "Campinas", state: "SP" },
  firstOrderAt: "2026-07-13T12:00:00.000Z",
  averageTicketCents: 12290,
}

const history: OrderPage = {
  orders: [
    { id: "o14", number: 14, status: "PREPARING", customer: { id: ID, name: "Caio Lima", phone: "5511955554444" }, fulfillment: "DELIVERY", paymentMethod: "PIX", totalCents: 17980, itemsCount: 2, placedAt: "2026-09-20T14:30:00.000Z" },
    { id: "o9", number: 9, status: "CANCELLED", customer: { id: ID, name: "Caio Lima", phone: "5511955554444" }, fulfillment: "PICKUP", paymentMethod: "MONEY", totalCents: 5990, itemsCount: 1, placedAt: "2026-08-30T12:00:00.000Z" },
  ],
  total: 22,
  page: 1,
  pageSize: 20,
}

function saving(over: object = {}) {
  return { mutate: mocks.mutate, reset: mocks.reset, error: null, isPending: false, isSuccess: false, ...over }
}

beforeEach(() => {
  mocks.search = new URLSearchParams()
  mocks.record.mockReturnValue({ data: caio, error: null, isPending: false })
  mocks.orders.mockReturnValue({ data: history, error: null, isFetching: false })
  mocks.update.mockReturnValue(saving())
})

afterEach(() => {
  vi.clearAllMocks()
})

function renderScreen() {
  return render(<CustomerScreen slug="loja" customerId={ID} messages={ui} web={web} />)
}

describe("CustomerScreen", () => {
  it("shows who the customer is, where they stand and their figures, the average ticket to the cent", () => {
    renderScreen()

    expect(screen.getByRole("heading", { level: 1, name: "Caio Lima" })).toBeInTheDocument()
    const figures = screen.getByRole("region", { name: "Números" })
    expect(figures).toHaveTextContent(/Ticket médio\s*R\$\s122,90/)
    expect(figures).toHaveTextContent(/Dias sem comprar\s*5/)
    const details = screen.getByRole("region", { name: "Dados" })
    expect(details).toHaveTextContent("5511955554444")
    expect(details).toHaveTextContent("Rua Barão de Jaguara, 1000 — Centro — Campinas/SP — CEP 13015-904")
  })

  it("asks for the customer's orders on the page the address holds, and leads each to its own page", () => {
    mocks.search = new URLSearchParams("page=2")
    renderScreen()

    expect(mocks.orders).toHaveBeenCalledWith("loja", { customerId: ID, page: 2 }, { enabled: true })
    expect(screen.getByRole("link", { name: "Abrir o pedido #14" })).toHaveAttribute("href", "/admin/loja/orders/14")
    expect(screen.getByRole("link", { name: "Abrir o pedido #9" })).toHaveAttribute("href", "/admin/loja/orders/9")
  })

  // The history is the last section: the next page is brought into view, not the top of the record.
  it("writes the next page of the history into the address, without jumping to the top", async () => {
    const scrolled = vi.fn()
    Element.prototype.scrollIntoView = scrolled
    renderScreen()

    await userEvent.click(screen.getByRole("button", { name: "Próxima" }))

    expect(mocks.replace).toHaveBeenCalledWith(`/admin/loja/customers/${ID}?page=2`, { scroll: false })
    expect(scrolled).toHaveBeenCalled()
  })

  // The figures may say 3 orders: a history that did not load must not answer "none yet" under its error.
  it("says the history did not load, and never that there are no orders", () => {
    mocks.search = new URLSearchParams("page=2")
    mocks.orders.mockReturnValue({ data: undefined, error: new Error("boom"), isFetching: false })
    renderScreen()

    expect(screen.getByRole("alert")).toBeInTheDocument()
    expect(screen.queryByText("Nenhum pedido ainda.")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Anterior" })).toBeInTheDocument()
  })

  it("goes back to the first page from a page past the end", () => {
    mocks.search = new URLSearchParams("page=5")
    mocks.orders.mockReturnValue({ data: { ...history, orders: [], page: 5 }, error: null, isFetching: false })
    renderScreen()

    expect(mocks.replace).toHaveBeenCalledWith(`/admin/loja/customers/${ID}`, { scroll: false })
  })

  it("opens a new order with the customer already chosen, and WhatsApp with the message for their stage", () => {
    renderScreen()

    expect(screen.getByRole("link", { name: "Novo pedido" })).toHaveAttribute("href", `/admin/loja/orders/new?customer=${ID}`)
    const message = decodeURIComponent(screen.getByRole("link", { name: "Chamar no WhatsApp: Caio Lima" }).getAttribute("href")!)
    expect(message).toMatch(/^https:\/\/wa\.me\/5511955554444\?text=Olá, Caio! Aqui é da Loja do Design\./)
    expect(message).toContain("Obrigado por comprar com a gente!")
  })

  it("sends the correction, and closes the form once it is saved", async () => {
    renderScreen()

    await userEvent.click(screen.getByRole("button", { name: "Editar dados" }))
    await userEvent.type(screen.getByLabelText("Nome"), " Souza")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))

    const [payload, options] = mocks.mutate.mock.calls[0]! as [unknown, { onSuccess: () => void }]
    expect(payload).toEqual({
      name: "Caio Lima Souza",
      phone: "5511955554444",
      address: { zipCode: "13015-904", street: "Rua Barão de Jaguara", number: "1000", complement: "", neighborhood: "Centro", city: "Campinas", state: "SP" },
    })
    options.onSuccess()
    expect(await screen.findByRole("button", { name: "Editar dados" })).toBeInTheDocument()
  })

  it("says at the phone field that another customer of the shop has that phone, with the form still open", async () => {
    mocks.update.mockReturnValue(saving({ error: new CustomerRequestError("CUSTOMER_PHONE_TAKEN") }))
    renderScreen()

    await userEvent.click(screen.getByRole("button", { name: "Editar dados" }))

    expect(mocks.reset).toHaveBeenCalled()
    expect(screen.getByLabelText("Celular")).toHaveAccessibleDescription(web.errors.CUSTOMER_PHONE_TAKEN)
    expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument()
  })

  it("says any other refusal under the form", async () => {
    mocks.update.mockReturnValue(saving({ error: new CustomerRequestError("BAD_REQUEST") }))
    renderScreen()

    await userEvent.click(screen.getByRole("button", { name: "Editar dados" }))

    const form = screen.getByRole("button", { name: "Salvar" }).closest("form")!
    expect(within(form).getByText(web.errors.BAD_REQUEST)).toBeInTheDocument()
    expect(screen.getByLabelText("Celular")).not.toHaveAttribute("aria-invalid")
  })

  it("draws a skeleton while the record is on its way", () => {
    mocks.record.mockReturnValue({ data: undefined, error: null, isPending: true })
    const { container } = renderScreen()

    expect(container.querySelectorAll("[data-slot=skeleton]").length).toBeGreaterThan(0)
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument()
  })

  it("says a customer is not the shop's, and leads back to the list", () => {
    mocks.record.mockReturnValue({ data: undefined, error: new CustomerRequestError("CUSTOMER_NOT_FOUND"), isPending: false })
    renderScreen()

    expect(screen.getByRole("alert")).toHaveTextContent(web.errors.CUSTOMER_NOT_FOUND)
    expect(screen.getByRole("link", { name: "Clientes" })).toHaveAttribute("href", "/admin/loja/customers")
    expect(mocks.orders).toHaveBeenCalledWith("loja", { customerId: "", page: 1 }, { enabled: false })
  })
})

describe("the record's address and correction", () => {
  it("reads a page it cannot mean as the first", () => {
    expect(historyPageOf(new URLSearchParams("page=3"))).toBe(3)
    expect(historyPageOf(new URLSearchParams("page=0"))).toBe(1)
    expect(historyPageOf(new URLSearchParams("page=abc"))).toBe(1)
    expect(historyPageOf(new URLSearchParams())).toBe(1)
  })

  it("leaves a phone nobody typed out of the correction, so a record without one keeps none", () => {
    const address = { zipCode: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" }

    expect(correctionOf({ name: " Rita ", phone: " ", address })).toEqual({ name: "Rita", address })
    expect(correctionOf({ name: "Rita", phone: "(11) 96666-5555", address })).toEqual({ name: "Rita", phone: "(11) 96666-5555", address })
  })
})
