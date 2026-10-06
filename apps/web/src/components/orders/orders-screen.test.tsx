// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { OrderPage } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { ptBR as web } from "@/locales/pt-BR"
import { OrdersScreen } from "./orders-screen"

const mocks = vi.hoisted(() => ({ replace: vi.fn(), search: new URLSearchParams(), orders: vi.fn() }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => mocks.search,
}))
vi.mock("@/services/orders/order-hooks", () => ({ useOrders: mocks.orders }))

const row = { id: "o", customer: { id: "c", name: "Bia Souza", phone: null }, fulfillment: "PICKUP", totalCents: 5990, deliveryFeeCents: 0, itemsCount: 1, placedAt: "2026-10-06T13:00:00.000Z" } as const
const page: OrderPage = {
  orders: [
    { ...row, number: 3, status: "RECEIVED", paymentMethod: "PIX", paymentChannel: "ONLINE", payment: { status: "RECEIVED", expiresAt: null, paidAt: "2026-10-06T13:05:00.000Z" }, strays: 0 },
    { ...row, number: 2, status: "RECEIVED", paymentMethod: "CREDIT_CARD", paymentChannel: "ONLINE", payment: { status: "PENDING", expiresAt: "2026-10-08T02:59:59.999Z", paidAt: null }, strays: 0 },
    { ...row, number: 1, status: "ACCEPTED", paymentMethod: "MONEY", paymentChannel: "OFFLINE", payment: null, strays: 0 },
  ],
  total: 3,
  page: 1,
  pageSize: 20,
}

beforeEach(() => {
  mocks.search = new URLSearchParams()
  mocks.orders.mockReturnValue({ data: page, error: null, isPending: false, isFetching: false })
})

afterEach(() => vi.clearAllMocks())

const renderScreen = () => render(<OrdersScreen slug="loja" messages={ui} web={web} />)

describe("OrdersScreen", () => {
  it("says where the money of each order charged online stands, and nothing of one settled with the shop", () => {
    renderScreen()

    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1)
    expect(rows[0]).toHaveTextContent("PixPago")
    expect(rows[1]).toHaveTextContent("Cartão de créditoAguardando pagamento")
    expect(rows[2]).toHaveTextContent("Dinheiro")
    expect(rows[2]).not.toHaveTextContent(/Pago|Aguardando/)
  })

  /** BEELINK-207: the payment filter lives in the address, beside the status and the search. */
  it("filters by payment in the address, keeping the status and the search, back at page one", async () => {
    mocks.search = new URLSearchParams("status=RECEIVED&q=bia&page=3")
    renderScreen()

    const filter = screen.getByRole("group", { name: "Filtrar por pagamento" })
    expect(within(filter).getByRole("button", { name: "Qualquer pagamento" })).toHaveAttribute("aria-pressed", "true")
    await userEvent.click(within(filter).getByRole("button", { name: "Aguardando pagamento" }))

    expect(mocks.replace).toHaveBeenCalledWith("/admin/loja/orders?status=RECEIVED&payment=PENDING&q=bia")
  })

  it("asks the API for what the address says, and marks the filter that is on", () => {
    mocks.search = new URLSearchParams("payment=PAID&status=ACCEPTED")
    renderScreen()

    expect(mocks.orders).toHaveBeenCalledWith("loja", { status: "ACCEPTED", payment: "PAID", page: 1 })
    const filter = screen.getByRole("group", { name: "Filtrar por pagamento" })
    expect(within(filter).getByRole("button", { name: "Pagos" })).toHaveAttribute("aria-pressed", "true")
    expect(within(filter).getByRole("button", { name: "Pagamento a resolver" })).toHaveAttribute("aria-pressed", "false")
  })

  it("takes the payment filter off, and changes the status without losing it", async () => {
    mocks.search = new URLSearchParams("payment=STRAY")
    renderScreen()

    await userEvent.click(within(screen.getByRole("group", { name: "Filtrar por pagamento" })).getByRole("button", { name: "Qualquer pagamento" }))
    expect(mocks.replace).toHaveBeenLastCalledWith("/admin/loja/orders")

    await userEvent.click(within(screen.getByRole("group", { name: "Filtrar por status" })).getByRole("button", { name: "Entregue" }))
    expect(mocks.replace).toHaveBeenLastCalledWith("/admin/loja/orders?status=DELIVERED&payment=STRAY")
  })

  it("reads an unknown payment in the address as none, and never asks for the bell's own filter", () => {
    mocks.search = new URLSearchParams("payment=PAID_UNSEEN")
    renderScreen()

    expect(mocks.orders).toHaveBeenCalledWith("loja", { page: 1 })
  })

  it("says nothing matches when only the payment filter is on, and draws shapes while it reads", () => {
    mocks.search = new URLSearchParams("payment=STRAY")
    mocks.orders.mockReturnValue({ data: { ...page, orders: [], total: 0 }, error: null, isPending: false, isFetching: false })
    const { rerender } = renderScreen()
    expect(screen.getByText("Nenhum pedido com essa busca ou esses filtros.")).toBeInTheDocument()

    mocks.orders.mockReturnValue({ data: undefined, error: null, isPending: true, isFetching: true })
    rerender(<OrdersScreen slug="loja" messages={ui} web={web} />)
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    expect(screen.queryByText(/Carregando/i)).not.toBeInTheDocument()
  })
})
