// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { CustomerOrderPayment } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { PAYMENT_POLL_MS, PIX_CODE_POLL_MS } from "@/lib/order-payment-view"
import { IN_PROGRESS_REREAD_MS } from "@/lib/order-payment-refusal"
import { APPROVED_LINGER_MS, OrderPaymentLive, type OrderPaymentLiveProps } from "./order-payment-live"

const router = vi.hoisted(() => ({ refresh: vi.fn(), replace: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => router }))
vi.mock("next/link", () => ({ default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a> }))

const NOW = new Date("2026-10-06T15:00:00.000Z")
const LATER = "2026-10-08T02:59:59.999Z"
const PATH = "/loja/api/orders/14/payment"
/** Past TanStack's wait before a first retry. */
const RETRY_MS = 1_500

const pix = (over: Partial<CustomerOrderPayment> = {}): CustomerOrderPayment => ({ status: "PENDING", method: "PIX", installments: 1, amountCents: 5990, refundedCents: 0, expiresAt: LATER, paidAt: null, pix: { payload: "00020101-PIX", image: "aGk=", expiresAt: LATER }, invoiceUrl: null, ...over })
const card = (over: Partial<CustomerOrderPayment> = {}): CustomerOrderPayment => pix({ method: "CREDIT_CARD", installments: 3, amountCents: 23970, pix: null, invoiceUrl: "https://www.asaas.com/i/abc", ...over })
/** An answer with no stream under it: a real `Response` hands its body over on the real clock, which these tests hold still. */
const reply = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body }) as Response
const refusal = (statusCode: number, errorCode: string) => reply(statusCode, { statusCode, errorCode, message: "x" })

type Answer = () => Response
/** The shop's payment handler: `reads` are answered in turn, the last one for good; `makes` likewise. */
function handler({ reads, makes = [] }: { reads: Answer[]; makes?: Answer[] }) {
  const calls: string[] = []
  const next = (queue: Answer[]) => (queue.length > 1 ? queue.shift()! : queue[0]!)()
  vi.stubGlobal("fetch", async (path: string, init?: RequestInit) => {
    const method = init?.method ?? "GET"
    calls.push(`${method} ${path}`)
    return method === "POST" ? next(makes) : next(reads)
  })
  return { calls, count: (method: string) => calls.filter((call) => call === `${method} ${PATH}`).length }
}

const answer = (payment: CustomerOrderPayment | null): Answer => () => reply(200, { payment })

function renderScreen(props: Partial<OrderPaymentLiveProps> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <OrderPaymentLive slug="loja" number={14} orderHref="/loja/conta/pedidos/14" profileHref="/loja/conta/perfil?voltar=x" order={{ cancelled: false, awaitingTotal: false }} locale="pt-BR" messages={ptBR} {...props} />
    </QueryClientProvider>,
  )
}

/** Lets what is pending settle — a read, the redraw after it, an effect's timer of no delay — without moving the clock past the next interval. */
const settle = () =>
  act(async () => {
    for (let turn = 0; turn < 4; turn += 1) await vi.advanceTimersByTimeAsync(1)
  })
const pass = async (ms: number) => {
  await act(async () => void (await vi.advanceTimersByTimeAsync(ms)))
  await settle()
}
/** TanStack listens for the tab on `window`. */
const tab = (state: "hidden" | "visible") => {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state })
  window.dispatchEvent(new Event("visibilitychange"))
}

beforeEach(() => {
  // The clock is held and moved by hand, and still ticks with the real one: TanStack Query does not tell its observers under a clock that stands still.
  vi.useFakeTimers({ now: NOW, shouldAdvanceTime: true })
})

afterEach(() => {
  tab("visible")
  vi.useRealTimers()
  vi.unstubAllGlobals()
  router.refresh.mockReset()
  router.replace.mockReset()
})

describe("OrderPaymentLive — the payment screen of an order", () => {
  it("draws a skeleton while the charge is read, then the Pix: amount, QR, code and until when it is good", async () => {
    const shop = handler({ reads: [answer(pix())] })
    const { container } = renderScreen()
    expect(container.querySelector("[aria-hidden='true'].animate-pulse")).not.toBeNull()
    expect(screen.queryByText(/carregando/i)).toBeNull()

    await settle()

    expect(shop.calls).toEqual([`GET ${PATH}`])
    expect(screen.getByRole("heading", { level: 1, name: "Pagamento do pedido #14" })).toBeInTheDocument()
    expect(screen.getByRole("img", { name: "QR code do Pix" })).toHaveAttribute("src", "data:image/png;base64,aGk=")
    expect(screen.getByText("00020101-PIX")).toBeInTheDocument()
    expect(screen.getByText(/R\$\s59,90/)).toBeInTheDocument()
    expect(screen.getByText("Vale até 7 de out., 23:59")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ver pedido" })).toHaveAttribute("href", "/loja/conta/pedidos/14")
  })

  it("draws the card: amount, instalments and Asaas's page in a new tab, told nothing of this one", async () => {
    handler({ reads: [answer(card())] })
    renderScreen()
    await settle()

    expect(screen.getByText(/3x de R\$\s79,90 sem juros/)).toBeInTheDocument()
    const door = screen.getByRole("link", { name: /Pagar com cartão/ })
    expect(door).toHaveAttribute("href", "https://www.asaas.com/i/abc")
    expect(door).toHaveAttribute("target", "_blank")
    expect(door).toHaveAttribute("rel", "noopener noreferrer")
    expect(screen.getByText(/a confirmação aparece nesta página/)).toBeInTheDocument()
  })

  it("asks the bee-link handler again at an interval while it waits for money — and nothing else, ever", async () => {
    const shop = handler({ reads: [answer(pix())] })
    renderScreen()
    await settle()

    await pass(PAYMENT_POLL_MS)
    await pass(PAYMENT_POLL_MS)

    expect(shop.count("GET")).toBe(3)
    expect(new Set(shop.calls)).toEqual(new Set([`GET ${PATH}`]))
  })

  it("stops asking while the tab is hidden, and asks at once when it comes back", async () => {
    const shop = handler({ reads: [answer(pix())] })
    renderScreen()
    await settle()

    tab("hidden")
    await pass(PAYMENT_POLL_MS * 4)
    expect(shop.count("GET")).toBe(1)

    tab("visible")
    await settle()
    expect(shop.count("GET")).toBe(2)
  })

  it("turns to approved the moment the API says paid, stops asking, and goes on to the order", async () => {
    const shop = handler({ reads: [answer(pix()), answer(pix({ status: "RECEIVED", pix: null, paidAt: NOW.toISOString() }))] })
    renderScreen()
    await settle()
    expect(screen.queryByText("Pagamento aprovado")).toBeNull()

    await pass(PAYMENT_POLL_MS)
    expect(screen.getByRole("status")).toHaveTextContent("Pagamento aprovado")
    expect(screen.queryByRole("img", { name: "QR code do Pix" })).toBeNull()
    expect(router.replace).not.toHaveBeenCalled()

    await pass(APPROVED_LINGER_MS)
    expect(router.replace).toHaveBeenCalledExactlyOnceWith("/loja/conta/pedidos/14")
    await pass(PAYMENT_POLL_MS * 3)
    expect(shop.count("GET")).toBe(2)
  })

  it("offers a new Pix once it expired, makes it through the handler, and shows the new one without reading again", async () => {
    const shop = handler({ reads: [answer(pix({ expiresAt: "2026-10-06T02:59:59.999Z", pix: null }))], makes: [answer(pix({ pix: { payload: "NOVO-PIX", image: "bm92bw==", expiresAt: LATER } }))] })
    renderScreen()
    await settle()
    expect(screen.getByRole("heading", { name: "Este Pix venceu" })).toBeInTheDocument()
    // Nothing changes by itself: it does not ask again.
    await pass(PAYMENT_POLL_MS * 3)
    expect(shop.count("GET")).toBe(1)

    fireEvent.click(screen.getByRole("button", { name: "Gerar novo Pix" }))
    await settle()

    expect(shop.count("POST")).toBe(1)
    expect(screen.getByText("NOVO-PIX")).toBeInTheDocument()
    expect(shop.count("GET")).toBe(1)
  })

  it("says there is no charge yet, in words, and makes one", async () => {
    const shop = handler({ reads: [answer(null)], makes: [answer(card())] })
    renderScreen()
    await settle()
    expect(screen.getByRole("heading", { name: "O pagamento ainda não foi gerado" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Gerar pagamento" }))
    await settle()

    expect(shop.count("POST")).toBe(1)
    expect(screen.getByRole("link", { name: /Pagar com cartão/ })).toBeInTheDocument()
  })

  it("waits on the shop, with no charge to make, while the delivery fee is not agreed", async () => {
    handler({ reads: [answer(null)] })
    renderScreen({ order: { cancelled: false, awaitingTotal: true } })
    await settle()

    expect(screen.getByRole("heading", { name: "Aguardando a loja informar o frete" })).toBeInTheDocument()
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("waits for a Pix's code Asaas has not handed over, asking again more slowly", async () => {
    const shop = handler({ reads: [answer(pix({ pix: null })), answer(pix())] })
    renderScreen()
    await settle()
    expect(screen.getByRole("heading", { name: "Gerando o seu Pix" })).toBeInTheDocument()

    await pass(PAYMENT_POLL_MS)
    expect(shop.count("GET")).toBe(1)
    await pass(PIX_CODE_POLL_MS - PAYMENT_POLL_MS)
    expect(screen.getByRole("img", { name: "QR code do Pix" })).toBeInTheDocument()
  })

  it.each([
    ["PAYMENT_REFUSED", 502, "A cobrança não pôde ser gerada. Fale com a loja para combinar o pagamento."],
    ["PAYMENT_UNAVAILABLE", 503, "A loja não consegue receber online agora. Tente de novo em instantes."],
    ["PAYMENT_BELOW_MINIMUM", 409, "O valor deste pedido é menor que o mínimo para pagar online. Fale com a loja para combinar o pagamento."],
    ["RATE_LIMITED", 429, "Muitas tentativas. Aguarde um pouco e tente de novo."],
    ["SOMETHING_NEW", 500, "Não foi possível gerar o pagamento agora. Tente de novo."],
  ])("says %s in its own sentence, and leaves the charge to be tried again", async (errorCode, statusCode, sentence) => {
    const shop = handler({ reads: [answer(null)], makes: [() => refusal(statusCode, errorCode)] })
    renderScreen()
    await settle()

    fireEvent.click(screen.getByRole("button", { name: "Gerar pagamento" }))
    await settle()

    expect(screen.getByRole("alert")).toHaveTextContent(sentence)
    expect(screen.getByRole("button", { name: "Gerar pagamento" })).toBeEnabled()
    await pass(IN_PROGRESS_REREAD_MS * 2)
    expect(shop.count("GET")).toBe(1)
  })

  it("leads to the shopper's record when the charge needs a CPF it does not have", async () => {
    handler({ reads: [answer(null)], makes: [() => refusal(409, "PAYMENT_DOCUMENT_MISSING")] })
    renderScreen()
    await settle()

    fireEvent.click(screen.getByRole("button", { name: "Gerar pagamento" }))
    await settle()

    const alert = screen.getByRole("alert")
    expect(alert).toHaveTextContent("Para pagar online, o seu cadastro precisa ter o CPF.")
    expect(within(alert).getByRole("link", { name: "Informar CPF no cadastro" })).toHaveAttribute("href", "/loja/conta/perfil?voltar=x")
  })

  it("says another request is making the charge, reads again in a moment, and shows what it made", async () => {
    const shop = handler({ reads: [answer(null), answer(pix())], makes: [() => refusal(409, "PAYMENT_IN_PROGRESS")] })
    renderScreen()
    await settle()

    fireEvent.click(screen.getByRole("button", { name: "Gerar pagamento" }))
    await settle()
    expect(screen.getByRole("alert")).toHaveTextContent("O pagamento está sendo gerado.")
    expect(shop.count("GET")).toBe(1)

    await pass(IN_PROGRESS_REREAD_MS)
    expect(shop.count("GET")).toBe(2)
    expect(screen.getByRole("img", { name: "QR code do Pix" })).toBeInTheDocument()
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it.each([
    ["PAYMENT_ALREADY_PAID", pix({ status: "RECEIVED", pix: null }), "Pagamento aprovado"],
    ["PAYMENT_AWAITING_TOTAL", null, "O pagamento ainda não foi gerado"],
    ["PAYMENT_NOT_ONLINE", null, "O pagamento ainda não foi gerado"],
  ])("reads the charge again at once on %s: the screen was behind", async (errorCode, then, heading) => {
    const shop = handler({ reads: [answer(null), answer(then)], makes: [() => refusal(409, errorCode)] })
    renderScreen()
    await settle()

    fireEvent.click(screen.getByRole("button", { name: "Gerar pagamento" }))
    await settle()
    await settle()

    expect(shop.count("GET")).toBe(2)
    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument()
  })

  it("says a cancelled order has nothing to pay, whatever charge it still shows, and asks nothing again", async () => {
    const shop = handler({ reads: [answer(pix({ pix: null }))] })
    renderScreen({ order: { cancelled: true, awaitingTotal: false } })
    await settle()

    expect(screen.getByRole("heading", { name: "Este pedido foi cancelado" })).toBeInTheDocument()
    expect(screen.queryByRole("button")).toBeNull()
    await pass(PAYMENT_POLL_MS * 3)
    expect(shop.count("GET")).toBe(1)
  })

  it("says the payment could not be read — never that there is none — and reads again when asked", async () => {
    // Asked twice before it gives up: one more try is the hook's own.
    const shop = handler({ reads: [() => refusal(502, "UNKNOWN"), () => refusal(502, "UNKNOWN"), answer(pix())] })
    renderScreen()
    await pass(RETRY_MS)

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar o pagamento")
    expect(screen.queryByRole("button", { name: "Gerar pagamento" })).toBeNull()
    await pass(PAYMENT_POLL_MS * 3)
    expect(shop.count("GET")).toBe(2)

    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))
    await settle()
    expect(screen.getByRole("img", { name: "QR code do Pix" })).toBeInTheDocument()
  })

  it("reads the page again when the session ended: the page sends the shopper to sign in and back", async () => {
    handler({ reads: [() => refusal(401, "AUTH_UNAUTHENTICATED")] })
    renderScreen()
    await settle()

    expect(router.refresh).toHaveBeenCalled()
  })
})
