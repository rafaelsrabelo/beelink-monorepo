// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { Order } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { ptBR as web } from "@/locales/pt-BR"
import { OrderRequestError } from "@/services/orders/order-requests"
import { OrderRefundScreen } from "./order-refund-screen"

const mocks = vi.hoisted(() => ({ order: vi.fn(), refund: vi.fn(), mutate: vi.fn(), push: vi.fn() }))

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock("@/services/orders/order-hooks", () => ({ useOrder: mocks.order, useRefundOrder: mocks.refund }))

const payment: NonNullable<Order["payment"]> = {
  status: "PARTIALLY_REFUNDED",
  method: "PIX",
  installments: 1,
  amountCents: 5990,
  refundedCents: 2000,
  refundingCents: 0,
  refundableCents: 3990,
  refunds: [],
  expiresAt: null,
  paidAt: "2026-10-06T13:05:00.000Z",
  providerStatus: "RECEIVED",
  lastError: null,
  strays: [{ id: "s1", reason: "ORDER_ALREADY_PAID", method: "PIX", amountCents: 5990, paidAt: "2026-10-06T13:40:00.000Z", refundableCents: 5990, resolvedAt: null }],
  unseen: false,
}
const order = { number: 7, status: "RECEIVED", paymentChannel: "ONLINE", payment } as Order

const read = (data: Order | undefined, over: object = {}) => ({ data, error: null, isPending: false, ...over })
const idle = (over: object = {}) => ({ mutate: mocks.mutate, isPending: false, isSuccess: false, error: null, ...over })

beforeEach(() => {
  mocks.order.mockReturnValue(read(order))
  mocks.refund.mockReturnValue(idle())
})
afterEach(() => vi.clearAllMocks())

const renderScreen = (over: { cancel?: boolean; strayId?: string } = {}) => render(<OrderRefundScreen slug="loja" number={7} messages={ui} web={web} {...over} />)
const reason = () => screen.getByLabelText("Motivo")

describe("OrderRefundScreen — the refund of an order's payment (BEELINK-208)", () => {
  it("starts from what is left of the payment, and sends the refund with what the screen saw as left", async () => {
    const user = userEvent.setup()
    renderScreen()

    expect(screen.getByRole("heading", { name: "Estornar o pagamento do pedido #7" })).toBeInTheDocument()
    expect(screen.getByLabelText("Valor do estorno")).toHaveValue("39,90")
    await user.type(reason(), "Produto com defeito")
    await user.click(screen.getByRole("button", { name: /Estornar R\$\s39,90/ }))

    expect(mocks.mutate).toHaveBeenCalledWith({ amountCents: 3990, reason: "Produto com defeito", refundableCents: 3990, cancel: false }, expect.any(Object))
    // Back to the order once Asaas took it.
    mocks.mutate.mock.calls[0]?.[1].onSuccess()
    expect(mocks.push).toHaveBeenCalledWith("/admin/loja/orders/7")
  })

  it("sends a cancellation's refund as all that is left, with the cancel", async () => {
    const user = userEvent.setup()
    renderScreen({ cancel: true })

    expect(screen.getByRole("heading", { name: "Cancelar o pedido #7 e estornar o pagamento" })).toBeInTheDocument()
    await user.type(reason(), "Sem estoque")
    await user.click(screen.getByRole("button", { name: /Estornar R\$\s39,90 e cancelar o pedido/ }))

    expect(mocks.mutate).toHaveBeenCalledWith({ amountCents: 3990, reason: "Sem estoque", refundableCents: 3990, cancel: true }, expect.any(Object))
  })

  it("refunds money the order did not ask for by its id, from that payment's own amount", async () => {
    const user = userEvent.setup()
    renderScreen({ strayId: "s1" })

    expect(screen.getByRole("heading", { name: "Estornar um pagamento a resolver do pedido #7" })).toBeInTheDocument()
    expect(screen.getByLabelText("Valor do estorno")).toHaveValue("59,90")
    await user.type(reason(), "Pago em dobro")
    await user.click(screen.getByRole("button", { name: /Estornar R\$\s59,90/ }))

    expect(mocks.mutate).toHaveBeenCalledWith({ amountCents: 5990, reason: "Pago em dobro", refundableCents: 5990, cancel: false, strayId: "s1" }, expect.any(Object))
  })

  it("says why Asaas refused, in the shop's words, and starts over from what is left when that changed", () => {
    mocks.refund.mockReturnValue(idle({ error: new OrderRequestError("REFUND_NO_BALANCE") }))
    const { rerender } = renderScreen()
    expect(screen.getByRole("alert")).toHaveTextContent("A sua conta Asaas não tem saldo para este estorno.")

    mocks.refund.mockReturnValue(idle({ error: new OrderRequestError("REFUND_STALE") }))
    mocks.order.mockReturnValue(read({ ...order, payment: { ...payment, refundedCents: 4000, refundableCents: 1990 } }))
    rerender(<OrderRefundScreen slug="loja" number={7} messages={ui} web={web} />)
    expect(screen.getByRole("alert")).toHaveTextContent("O pagamento mudou desde que esta tela foi aberta.")
    expect(screen.getByLabelText("Valor do estorno")).toHaveValue("19,90")
  })

  it("offers nothing on a payment that holds no money, a stray payment already given back, or an order with no payment", () => {
    mocks.order.mockReturnValue(read({ ...order, payment: { ...payment, status: "REFUNDED", refundableCents: 0 } }))
    const { rerender } = renderScreen()
    expect(screen.getByText("Este pedido não tem valor disponível para estorno.")).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()

    mocks.order.mockReturnValue(read(order))
    rerender(<OrderRefundScreen slug="loja" number={7} strayId="gone" messages={ui} web={web} />)
    expect(screen.queryByRole("button")).not.toBeInTheDocument()

    mocks.order.mockReturnValue(read({ ...order, payment: null }))
    rerender(<OrderRefundScreen slug="loja" number={7} messages={ui} web={web} />)
    expect(screen.getByRole("alert")).toHaveTextContent("Este pedido não tem valor disponível para estorno.")
    expect(screen.getByRole("link", { name: "Voltar ao pedido" })).toHaveAttribute("href", "/admin/loja/orders/7")
  })

  it("draws shapes while the order is read, and says an order that is not the shop's", () => {
    mocks.order.mockReturnValue(read(undefined, { isPending: true }))
    const { rerender } = renderScreen()
    expect(screen.queryByRole("heading")).not.toBeInTheDocument()

    mocks.order.mockReturnValue(read(undefined, { error: new OrderRequestError("ORDER_NOT_FOUND") }))
    rerender(<OrderRefundScreen slug="loja" number={7} messages={ui} web={web} />)
    expect(screen.getByRole("alert")).toHaveTextContent("Esse pedido não existe nesta loja.")
  })
})
