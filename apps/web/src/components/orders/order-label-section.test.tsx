// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { OrderLabelOverview } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { OrderRequestError } from "@/services/orders/order-requests"
import { OrderLabelSection } from "./order-label-section"

const mocks = vi.hoisted(() => ({ overview: vi.fn(), buy: vi.fn(), cancel: vi.fn(), print: vi.fn() }))
vi.mock("@/services/orders/label-hooks", () => ({ useOrderLabel: mocks.overview, useBuyOrderLabel: mocks.buy, useCancelOrderLabel: mocks.cancel, usePrintOrderLabel: mocks.print }))

const ready: OrderLabelOverview = {
  label: null,
  blockers: [],
  carrier: { serviceId: 2, service: "SEDEX", company: "Correios" },
  suggestedVolume: { weightGrams: 600, lengthMm: 260, widthMm: 200, heightMm: 80 },
  balanceCents: 10000,
  walletUrl: "https://sandbox.melhorenvio.com.br",
}
const buy = vi.fn()
const print = vi.fn()
const idle = (mutate = vi.fn(), error: Error | null = null) => ({ mutate, reset: vi.fn(), isPending: false, error })

function with_(overview: OrderLabelOverview | null, buyError: Error | null = null) {
  mocks.overview.mockReturnValue(overview ? { isPending: false, data: overview } : { isPending: true })
  mocks.buy.mockReturnValue(idle(buy, buyError))
  mocks.cancel.mockReturnValue(idle())
  mocks.print.mockReturnValue(idle(print))
}

beforeEach(() => {
  buy.mockReset()
  print.mockReset()
  with_(ready)
})

describe("OrderLabelSection (BEELINK-187)", () => {
  it("buys the label for the box Melhor Envio worked out, as grams and millimetres", async () => {
    render(<OrderLabelSection slug="loja" number={12} locale="pt-BR" messages={ui} />)

    await userEvent.clear(screen.getByLabelText("Peso (g)"))
    await userEvent.type(screen.getByLabelText("Peso (g)"), "650")
    await userEvent.click(screen.getByRole("button", { name: "Comprar etiqueta" }))

    expect(buy).toHaveBeenCalledWith({ volume: { weightGrams: 650, lengthMm: 260, widthMm: 200, heightMm: 80 }, invoiceKey: null }, expect.anything())
  })

  it("refuses an invoice key that is not 44 digits before sending anything", async () => {
    render(<OrderLabelSection slug="loja" number={12} locale="pt-BR" messages={ui} />)

    await userEvent.type(screen.getByLabelText("Chave da nota fiscal (opcional)"), "123")
    await userEvent.click(screen.getByRole("button", { name: "Comprar etiqueta" }))

    expect(buy).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Chave da nota fiscal (opcional)")).toHaveAccessibleDescription(/44 dígitos/)
  })

  it("says the wallet is short, by how much, with the way to Melhor Envio", () => {
    with_(ready, new OrderRequestError("LABEL_BALANCE_INSUFFICIENT", { balanceCents: 1000, priceCents: 2745, walletUrl: "https://sandbox.melhorenvio.com.br" }))
    render(<OrderLabelSection slug="loja" number={12} locale="pt-BR" messages={ui} />)

    expect(screen.getByRole("alert")).toHaveTextContent(/a carteira tem R\$\s10,00 e a etiqueta custa R\$\s27,45/)
    expect(screen.getByRole("link", { name: "Abrir o Melhor Envio" })).toHaveAttribute("href", "https://sandbox.melhorenvio.com.br")
  })

  it("opens the PDF in a tab the press itself opens", async () => {
    const tab = { opener: {} as unknown, location: { href: "" }, close: vi.fn() }
    vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window)
    print.mockImplementation((_: undefined, options: { onSuccess: (answer: { url: string }) => void }) => options.onSuccess({ url: "https://sandbox.melhorenvio.test/imprimir/x" }))
    with_({ ...ready, label: { status: "GENERATED", protocol: "ORD-1", priceCents: 2745, volume: ready.suggestedVolume!, invoiceKey: null, trackingCode: "ME1", createdAt: "", paidAt: "", generatedAt: "", cancelledAt: null } })
    render(<OrderLabelSection slug="loja" number={12} locale="pt-BR" messages={ui} />)

    await userEvent.click(screen.getByRole("button", { name: "Imprimir etiqueta" }))

    expect(tab.opener).toBeNull()
    expect(tab.location.href).toBe("https://sandbox.melhorenvio.test/imprimir/x")
  })

  it("says nothing for a carrier the shopkeeper told by hand, which has no service to buy a label with", () => {
    with_({ ...ready, blockers: ["NOT_CARRIER"], carrier: null })
    const { container } = render(<OrderLabelSection slug="loja" number={12} locale="pt-BR" messages={ui} />)

    expect(container).toBeEmptyDOMElement()
  })
})
