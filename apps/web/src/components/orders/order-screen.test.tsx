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
import { OrderScreen } from "./order-screen"

const mocks = vi.hoisted(() => ({ order: vi.fn(), markSeen: vi.fn(), push: vi.fn() }))
const idle = { mutate: vi.fn(), isPending: false, isSuccess: false, error: null, variables: undefined }

vi.mock("@/services/orders/order-hooks", () => ({
  useOrder: mocks.order,
  useUpdateOrderStatus: () => idle,
  useOrderDelivery: () => idle,
  useOrderDeliveryFee: () => idle,
  useMarkOrderPaymentSeen: () => ({ mutate: mocks.markSeen }),
}))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock("@/services/stores/store-hooks", () => ({ useStore: () => ({ data: { name: "Loja do Design" } }) }))
vi.mock("@/components/conversations/order-conversation-section", () => ({ OrderConversationSection: () => null }))
vi.mock("@/components/orders/order-label-section", () => ({ OrderLabelSection: () => null }))

const payment: NonNullable<Order["payment"]> = {
  status: "RECEIVED",
  method: "PIX",
  installments: 1,
  amountCents: 5990,
  refundedCents: 0,
  refundingCents: 0,
  refundableCents: 5990,
  refunds: [],
  expiresAt: "2026-10-08T02:59:59.999Z",
  paidAt: "2026-10-06T13:05:00.000Z",
  providerStatus: "RECEIVED",
  lastError: null,
  strays: [],
  unseen: true,
}

const order: Order = {
  id: "o1",
  number: 7,
  status: "RECEIVED",
  customer: { id: "c1", name: "Bia Souza", phone: null },
  fulfillment: "PICKUP",
  deliveryAddress: null,
  paymentMethod: "PIX",
  paymentChannel: "ONLINE",
  installments: 1,
  payment,
  items: [{ id: "i1", productId: "p1", variantId: "v1", productName: "Blusa", variantLabel: null, sku: null, unitPriceCents: 5990, quantity: 1, lineTotalCents: 5990, discountCents: 0, promotionName: null }],
  subtotalCents: 5990,
  deliveryFeeCents: 0,
  discountCents: 0,
  promotionDiscountCents: 0,
  couponDiscountCents: 0,
  coupon: null,
  cashback: null,
  cashbackUsedCents: 0,
  totalCents: 5990,
  note: null,
  placedAt: "2026-10-06T13:00:00.000Z",
  events: [{ status: "RECEIVED", actor: "CUSTOMER", at: "2026-10-06T13:00:00.000Z" }],
  delivery: null,
  deliveryWindow: null,
  createdAt: "2026-10-06T13:00:00.000Z",
}

const read = (data: Order | undefined, over: object = {}) => ({ data, error: null, isPending: false, ...over })

beforeEach(() => mocks.order.mockReturnValue(read(order)))
afterEach(() => vi.clearAllMocks())

const renderScreen = (number = 7) => render(<OrderScreen slug="loja" number={number} messages={ui} web={web} />)

describe("OrderScreen — the order's online payment (BEELINK-207)", () => {
  it("draws the payment of an order charged online: paid, how, how much", () => {
    renderScreen()

    const card = screen.getByRole("region", { name: "Pagamento online" })
    expect(card).toHaveTextContent("Pago")
    expect(card).toHaveTextContent("Pix")
    expect(card.textContent?.replace(/\s/g, " ")).toContain("R$ 59,90")
    expect(card).toHaveTextContent("O valor já está na sua conta Asaas.")
  })

  it("tells the API the shop saw a paid order, once, however often the screen draws again", () => {
    const { rerender } = renderScreen()
    rerender(<OrderScreen slug="loja" number={7} messages={ui} web={web} />)
    rerender(<OrderScreen slug="loja" number={7} messages={ui} web={web} />)

    expect(mocks.markSeen).toHaveBeenCalledTimes(1)
  })

  it("says nothing of an order already seen, one not paid yet, or one settled with the shop", () => {
    mocks.order.mockReturnValue(read({ ...order, payment: { ...payment, unseen: false } }))
    const { rerender } = renderScreen()
    mocks.order.mockReturnValue(read({ ...order, payment: { ...payment, status: "PENDING", paidAt: null, unseen: false } }))
    rerender(<OrderScreen slug="loja" number={7} messages={ui} web={web} />)
    mocks.order.mockReturnValue(read({ ...order, paymentChannel: "OFFLINE", payment: null }))
    rerender(<OrderScreen slug="loja" number={7} messages={ui} web={web} />)

    expect(mocks.markSeen).not.toHaveBeenCalled()
    expect(screen.queryByRole("region", { name: "Pagamento online" })).not.toBeInTheDocument()
  })

  it("says so again for another paid order opened in the same screen", () => {
    const { rerender } = renderScreen()
    mocks.order.mockReturnValue(read({ ...order, number: 8 }))
    rerender(<OrderScreen slug="loja" number={8} messages={ui} web={web} />)

    expect(mocks.markSeen).toHaveBeenCalledTimes(2)
  })

  it("keeps money the order did not ask for on the page", () => {
    mocks.order.mockReturnValue(read({ ...order, status: "CANCELLED", payment: { ...payment, unseen: false, strays: [{ id: "s1", refundableCents: 5990, resolvedAt: null, reason: "ORDER_CANCELLED", method: "PIX", amountCents: 5990, paidAt: "2026-10-06T13:05:00.000Z" }] } }))
    renderScreen()

    expect(screen.getByRole("group", { name: "Pagamento a resolver" })).toHaveTextContent("Este pedido foi pago depois de cancelado.")
    expect(screen.getByRole("link", { name: /Estornar R\$\s59,90/ })).toHaveAttribute("href", "/admin/loja/orders/7/refund?stray=s1")
  })

  it("leads to the refund's own screen while the shop holds money (BEELINK-208)", () => {
    renderScreen()

    expect(screen.getByRole("link", { name: "Estornar pagamento" })).toHaveAttribute("href", "/admin/loja/orders/7/refund")
  })

  it("sends a paid order's cancel to the refund's screen, and asks here for one that holds nothing", async () => {
    const user = userEvent.setup()
    const { unmount } = renderScreen()
    await user.click(screen.getByRole("button", { name: "Outros status" }))
    await user.click(await screen.findByRole("menuitem", { name: "Cancelar pedido" }))
    expect(mocks.push).toHaveBeenCalledWith("/admin/loja/orders/7/refund?cancel=1")
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    unmount()

    mocks.order.mockReturnValue(read({ ...order, payment: { ...payment, status: "REFUNDED", refundedCents: 5990, refundableCents: 0, unseen: false } }))
    renderScreen()
    await user.click(screen.getByRole("button", { name: "Outros status" }))
    await user.click(await screen.findByRole("menuitem", { name: "Cancelar pedido" }))
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument()
    expect(mocks.push).toHaveBeenCalledTimes(1)
  })

  it("draws shapes while the order is read, and asks nothing yet", () => {
    mocks.order.mockReturnValue(read(undefined, { isPending: true }))
    renderScreen()

    expect(screen.queryByRole("region", { name: "Pagamento online" })).not.toBeInTheDocument()
    expect(mocks.markSeen).not.toHaveBeenCalled()
  })
})
