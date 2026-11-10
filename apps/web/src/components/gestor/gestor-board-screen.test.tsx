// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { OrderPage, OrderSummary } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { ptBR as web } from "@/locales/pt-BR"
import { GestorBoardScreen } from "./gestor-board-screen"

const mocks = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), search: new URLSearchParams(), orders: vi.fn(), move: vi.fn() }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
  useSearchParams: () => mocks.search,
}))
vi.mock("@/services/orders/order-hooks", () => ({
  useOrders: mocks.orders,
  useMoveOrder: () => ({ mutate: mocks.move, isPending: false, error: null, variables: undefined }),
}))
vi.mock("./gestor-order-sheet", () => ({ GestorOrderSheet: ({ number, tab }: { number: number; tab: string }) => <p>pedido aberto {number} {tab}</p> }))

const base = { id: "o", customer: { id: "c", name: "Bia Souza", phone: null }, fulfillment: "PICKUP", totalCents: 2100, deliveryFeeCents: 0, itemsCount: 3, strays: 0, placedAt: "2026-11-10T17:00:00.000Z" } as const
const unpaid: OrderSummary = { ...base, number: 12, status: "RECEIVED", paymentMethod: "MONEY", paymentChannel: "OFFLINE", payment: null }
const paid: OrderSummary = { ...base, number: 11, status: "RECEIVED", paymentMethod: "PIX", paymentChannel: "ONLINE", payment: { status: "RECEIVED", expiresAt: null, paidAt: base.placedAt, refundingCents: 0 } }
const pageOf = (orders: OrderSummary[]): OrderPage => ({ orders, total: orders.length, page: 1, pageSize: 100 })

beforeEach(() => {
  mocks.search = new URLSearchParams()
  mocks.orders.mockImplementation((_slug: string, query: { status?: string }) => ({ data: pageOf(query.status === "OPEN" ? [unpaid, paid] : []), error: null, isPending: false }))
})
afterEach(() => vi.clearAllMocks())

const renderScreen = () => render(<GestorBoardScreen slug="leia" locale="pt-BR" messages={ui} web={web} />)

describe("GestorBoardScreen", () => {
  it("rings for the order waiting the longest and accepts it", async () => {
    renderScreen()
    const band = screen.getByRole("region", { name: /Pedido novo #11/ })
    await userEvent.click(within(band).getByRole("button", { name: "Aceitar pedido" }))
    expect(mocks.move).toHaveBeenCalledWith({ number: 11, status: "ACCEPTED" })
  })

  it("refuses an order that holds money on its refund's screen, and any other with a yes", async () => {
    renderScreen()
    await userEvent.click(within(screen.getByRole("region", { name: /Pedido novo #11/ })).getByRole("button", { name: "Recusar" }))
    expect(mocks.push).toHaveBeenCalledWith("/admin/leia/orders/11/refund?cancel=1")

    mocks.orders.mockImplementation((_slug: string, query: { status?: string }) => ({ data: pageOf(query.status === "OPEN" ? [unpaid] : []), error: null, isPending: false }))
    renderScreen()
    await userEvent.click(within(screen.getAllByRole("region", { name: /Pedido novo #12/ }).at(-1)!).getByRole("button", { name: "Recusar" }))
    await userEvent.click(await screen.findByRole("button", { name: "Recusar pedido" }))
    expect(mocks.move).toHaveBeenCalledWith({ number: 12, status: "CANCELLED" })
  })

  it("opens the order the address names, on the tab it names", () => {
    mocks.search = new URLSearchParams("pedido=12&aba=conversa")
    renderScreen()
    expect(screen.getByText("pedido aberto 12 conversa")).toBeInTheDocument()
  })

  it("draws a skeleton while the orders come", () => {
    mocks.orders.mockReturnValue({ data: undefined, error: null, isPending: true })
    renderScreen()
    expect(screen.queryByRole("heading", { name: "Pedidos" })).toBeNull()
  })
})
