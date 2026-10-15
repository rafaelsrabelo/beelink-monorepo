// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { BillingAccountAnswer, PlanCatalog, StoreSubscription, StoreSubscriptionAnswer } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { CONFIRMED_LINGER_MS } from "@/lib/subscribe-view"
import { messagesFor } from "@/locales"
import { SubscribeScreen } from "./subscribe-screen"

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => router }))
vi.mock("next/link", () => ({ default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a> }))

/** 15/10/2026, 12h in Brasília. */
const NOW = new Date("2026-10-15T15:00:00.000Z")
const ROUTE = "/api/stores/loja/subscription"
const INVOICE = "https://sandbox.asaas.com/i/exemplo"

const trialing: StoreSubscription = {
  id: "sub-1",
  status: "TRIALING",
  trialStartedAt: "2026-10-15T14:00:00.000Z",
  trialEndsAt: "2026-10-23T03:00:00.000Z",
  trialLastDay: "2026-10-22",
  trialDaysLeft: 7,
  plan: null,
  cycle: null,
  priceCents: null,
  currentPeriodEndsAt: null,
  cancelRequestedAt: null,
  freePeriodEndsAt: null,
  paymentMethod: null,
  invoiceUrl: null,
  card: null,
  graceEndsAt: null,
  lock: null,
}
const plan = { id: "plan-1", slug: "beelink", name: "Beelink" }
/** Example prices, not Beelink's: the screen holds no figure of its own. */
const catalog: PlanCatalog = {
  trialDays: 7,
  plans: [{ ...plan, cycles: [{ cycle: "MONTHLY", months: 1, priceCents: 10000 }, { cycle: "SEMIANNUAL", months: 6, priceCents: 54000 }, { cycle: "ANNUAL", months: 12, priceCents: 96000 }] }],
}
const annualOpen: StoreSubscription = { ...trialing, plan, cycle: "ANNUAL", priceCents: 96000, invoiceUrl: INVOICE }
const annualPaid: StoreSubscription = { ...annualOpen, status: "ACTIVE", invoiceUrl: null, paymentMethod: "PIX", currentPeriodEndsAt: "2027-10-16T03:00:00.000Z" }
const account: BillingAccountAnswer = { account: { name: "Maria Souza Lima", document: "***.982.247-**", documentType: "CPF", customerReady: true } }

const enforced = (subscription: StoreSubscription | null): StoreSubscriptionAnswer => ({ billingEnforced: true, subscription })
const reply = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body }) as Response
const refusal = (statusCode: number, errorCode: string) => reply(statusCode, { statusCode, errorCode, message: "x" })

type Answer = () => Response
interface Handler {
  reads?: Answer[]
  checks?: Answer[]
  choices?: Answer[]
  saves?: Answer[]
  account?: Answer
  plans?: Answer
}

/** The panel's billing handlers: each queue is answered in turn, its last answer for good. */
function handler({ reads = [() => reply(200, enforced(trialing))], checks = [() => reply(200, enforced(annualOpen))], choices = [() => reply(200, { invoiceUrl: INVOICE, subscription: annualOpen })], saves = [() => reply(200, account.account)], account: accountAnswer = () => reply(200, account), plans = () => reply(200, catalog) }: Handler = {}) {
  const calls: string[] = []
  const next = (queue: Answer[]) => (queue.length > 1 ? queue.shift()! : queue[0]!)()
  vi.stubGlobal("fetch", async (path: string, init?: RequestInit) => {
    const call = `${init?.method ?? "GET"} ${path}`
    calls.push(call)
    if (call === `GET ${ROUTE}`) return next(reads)
    if (call === `POST ${ROUTE}/check`) return next(checks)
    if (call === `PUT ${ROUTE}`) return next(choices)
    if (call === "GET /api/billing/plans") return plans()
    if (call === "GET /api/billing/account") return accountAnswer()
    if (call === "PUT /api/billing/account") return next(saves)
    throw new Error(`Nobody answers ${call}`)
  })
  return { calls, count: (call: string) => calls.filter((each) => each === call).length }
}

const opened = vi.fn()
function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <SubscribeScreen slug="loja" locale="pt-BR" back={{ href: "/admin/loja", label: "Início" }} messages={ptBR} errors={messagesFor("pt-BR").web.errors} />
    </QueryClientProvider>,
  )
}

/** Lets what is pending settle without moving the clock past the next interval. */
const settle = () =>
  act(async () => {
    for (let turn = 0; turn < 5; turn += 1) await vi.advanceTimersByTimeAsync(1)
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
const plain = (text: string | null | undefined) => (text ?? "").replace(/[  ]/g, " ")
const user = () => userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) })
const submit = () => screen.getByRole("button", { name: /Assinar e pagar|Continuar o pagamento|Trocar de plano/ })

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, shouldAdvanceTime: true })
  vi.stubGlobal("open", opened)
})

afterEach(() => {
  tab("visible")
  vi.useRealTimers()
  vi.unstubAllGlobals()
  opened.mockReset()
  router.replace.mockReset()
})

describe("SubscribeScreen (BEELINK-293), where nothing is charged", () => {
  it.each([
    ["billing switched off", { billingEnforced: false, subscription: trialing }],
    ["a page that owes nothing", enforced({ ...trialing, status: "EXEMPT" })],
    ["a page from before subscriptions", enforced(null)],
  ])("leads back to the page's panel with %s, offering nothing on the way", async (_what, answer) => {
    const { calls } = handler({ reads: [() => reply(200, answer)] })
    renderScreen()
    await settle()

    expect(router.replace).toHaveBeenCalledWith("/admin/loja")
    expect(screen.queryByRole("radio")).toBeNull()
    expect(calls).toEqual([`GET ${ROUTE}`])
  })
})

describe("SubscribeScreen, a page in trial", () => {
  it("draws where it stands and the catalogue's cycles, asking an account that never said who is charged", async () => {
    handler({ account: () => reply(200, { account: null }) })
    renderScreen()
    await settle()

    expect(screen.getByRole("heading", { level: 1, name: "Plano Beelink" })).toBeInTheDocument()
    expect(screen.getByText("O teste grátis vai até 22/10/2026. Faltam 7 dias.")).toBeInTheDocument()
    expect(screen.getAllByRole("radio")).toHaveLength(3)
    expect(screen.getByLabelText("CPF ou CNPJ")).toBeInTheDocument()
    expect(plain(submit().textContent)).toBe("Assinar e pagar R$ 100,00")
  })

  it("keeps who is charged, chooses the cycle, opens Asaas's invoice in another tab and waits on it", async () => {
    const { calls } = handler({ account: () => reply(200, { account: null }) })
    renderScreen()
    await settle()

    await user().type(screen.getByLabelText("Nome completo ou razão social"), "Maria Souza Lima")
    await user().type(screen.getByLabelText("CPF ou CNPJ"), "52998224725")
    await user().click(screen.getByRole("radio", { name: "Anual" }))
    await user().click(submit())
    await settle()

    expect(calls.filter((call) => call.startsWith("PUT"))).toEqual(["PUT /api/billing/account", `PUT ${ROUTE}`])
    expect(opened).toHaveBeenCalledExactlyOnceWith(INVOICE, "_blank", "noopener,noreferrer")
    expect(screen.getByRole("heading", { level: 2, name: "Aguardando a confirmação do pagamento" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Abrir a fatura/ })).toHaveAttribute("href", INVOICE)
  })

  it("shows the same invoice again to whoever comes back without paying, and asks on the way back", async () => {
    const { count } = handler()
    renderScreen()
    await settle()
    await user().click(screen.getByRole("radio", { name: "Anual" }))
    await user().click(submit())
    await settle()
    expect(count(`POST ${ROUTE}/check`)).toBe(0)

    tab("hidden")
    await pass(2_000)
    tab("visible")
    await settle()

    expect(count(`POST ${ROUTE}/check`)).toBe(1)
    expect(screen.getByRole("link", { name: /Abrir a fatura/ })).toHaveAttribute("href", INVOICE)
    // Choosing the same cycle again answers the same invoice: the way back to the cycles is there.
    await user().click(screen.getByRole("button", { name: "Escolher outro plano" }))
    expect(submit()).toHaveTextContent("Continuar o pagamento")
  })

  it("says the payment was confirmed once the API says so, and goes on to the page's panel", async () => {
    handler({ checks: [() => reply(200, enforced(annualOpen)), () => reply(200, enforced(annualPaid))] })
    renderScreen()
    await settle()
    await user().click(screen.getByRole("radio", { name: "Anual" }))
    await user().click(submit())
    await settle()

    await pass(10_000)
    expect(screen.queryByText("Pagamento confirmado")).toBeNull()
    await pass(10_000)

    expect(screen.getByRole("status", { name: "Pagamento confirmado" })).toHaveTextContent("Sua página está em dia até 15/10/2027.")
    expect(router.replace).not.toHaveBeenCalled()
    await pass(CONFIRMED_LINGER_MS)
    expect(router.replace).toHaveBeenCalledWith("/admin/loja")
  })

  it("asks now at the shopkeeper's word, and says when nothing was paid yet", async () => {
    const { count } = handler()
    renderScreen()
    await settle()
    await user().click(screen.getByRole("radio", { name: "Anual" }))
    await user().click(submit())
    await settle()

    await user().click(screen.getByRole("button", { name: "Já paguei, verificar agora" }))
    await settle()

    expect(count(`POST ${ROUTE}/check`)).toBe(1)
    expect(screen.getByText("Ainda não recebemos a confirmação deste pagamento.")).toBeInTheDocument()
  })

  it("opens no tab when the invoice charges other than the button said, and says the amount first", async () => {
    handler({ choices: [() => reply(200, { invoiceUrl: INVOICE, subscription: { ...annualOpen, cycle: "MONTHLY", priceCents: 11000 } })] })
    renderScreen()
    await settle()
    await user().click(submit())
    await settle()

    expect(opened).not.toHaveBeenCalled()
    expect(plain(screen.getByRole("alert").textContent)).toBe("O valor do plano mudou para R$ 110,00. Confira na fatura antes de pagar.")
    expect(screen.getByRole("link", { name: /Abrir a fatura/ })).toHaveAttribute("href", INVOICE)
  })

  it("asks who is charged when the API says the account never said, and goes on once it did", async () => {
    const { calls } = handler({ choices: [() => refusal(409, "BILLING_ACCOUNT_REQUIRED"), () => reply(200, { invoiceUrl: INVOICE, subscription: annualOpen })] })
    renderScreen()
    await settle()
    await user().click(submit())
    await settle()

    expect(screen.getByRole("alert")).toHaveTextContent("Informe os dados de cobrança para continuar.")
    await user().click(screen.getByRole("radio", { name: "Anual" }))
    await user().type(screen.getByLabelText("Nome completo ou razão social"), "Maria Souza Lima")
    await user().type(screen.getByLabelText("CPF ou CNPJ"), "11222333000181")
    await user().click(submit())
    await settle()

    expect(calls.filter((call) => call.startsWith("PUT"))).toEqual([`PUT ${ROUTE}`, "PUT /api/billing/account", `PUT ${ROUTE}`])
    expect(opened).toHaveBeenCalledOnce()
  })

  it.each([
    ["BILLING_UNREACHABLE", 503, "O Asaas não respondeu. Tente de novo: a assinatura continua de onde parou."],
    ["BILLING_SUBSCRIPTION_REFUSED", 502, "O Asaas recusou a assinatura. Tente de novo mais tarde ou fale com o suporte da Beelink."],
    ["BILLING_SUBSCRIPTION_BUSY", 409, "A fatura desta página já está sendo gerada. Tente de novo em instantes."],
    ["RATE_LIMITED", 429, "Muitas tentativas. Espere um minuto e tente de novo."],
  ])("says Asaas's %s in a sentence, and opens nothing", async (code, status, sentence) => {
    handler({ choices: [() => refusal(status, code)] })
    renderScreen()
    await settle()
    await user().click(submit())
    await settle()

    expect(screen.getByRole("alert")).toHaveTextContent(sentence)
    expect(opened).not.toHaveBeenCalled()
  })

  it("puts the API's refusal of the document on its field", async () => {
    handler({ account: () => reply(200, { account: null }), saves: [() => refusal(400, "BILLING_DOCUMENT_INVALID")] })
    renderScreen()
    await settle()
    await user().type(screen.getByLabelText("Nome completo ou razão social"), "Maria Souza Lima")
    await user().type(screen.getByLabelText("CPF ou CNPJ"), "52998224725")
    await user().click(submit())
    await settle()

    expect(screen.getByLabelText("CPF ou CNPJ")).toHaveAccessibleDescription("CPF ou CNPJ inválido: confira os números digitados.")
    expect(screen.queryByRole("alert", { name: /Asaas/ })).toBeNull()
  })

  it("reads the page again when the choice finds it paid, and says it is being processed while it does not read as paid", async () => {
    const { count } = handler({ choices: [() => refusal(409, "BILLING_SUBSCRIPTION_PAID")] })
    renderScreen()
    await settle()
    await user().click(submit())
    await settle()

    expect(count(`GET ${ROUTE}`)).toBe(2)
    expect(screen.getByRole("alert")).toHaveTextContent("Há um pagamento desta página sendo processado.")
  })
})

describe("SubscribeScreen, an invoice already out", () => {
  it("asks once on arriving, and carries on with the same cycle", async () => {
    const { calls, count } = handler({ reads: [() => reply(200, enforced(annualOpen))] })
    renderScreen()
    await settle()

    expect(count(`POST ${ROUTE}/check`)).toBe(1)
    expect(screen.getByRole("radio", { name: "Anual" })).toHaveAttribute("aria-checked", "true")
    await user().click(submit())
    await settle()

    expect(calls.filter((call) => call.startsWith("PUT"))).toEqual([`PUT ${ROUTE}`])
    expect(opened).toHaveBeenCalledWith(INVOICE, "_blank", "noopener,noreferrer")
  })
})

describe("SubscribeScreen, a page that paid", () => {
  it("has nothing to sell a page whose period is running", async () => {
    handler({ reads: [() => reply(200, enforced({ ...annualPaid, paymentMethod: "CREDIT_CARD", card: { brand: "VISA", last4: "4242" } }))] })
    renderScreen()
    await settle()

    expect(screen.getByText("Em dia")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2, name: "Sua página está em dia" })).toBeInTheDocument()
    expect(screen.queryByRole("radio")).toBeNull()
    expect(router.replace).not.toHaveBeenCalled()
  })

  it("leads a renewal past its day to the invoice due, and waits once it is opened", async () => {
    const due = { ...annualPaid, status: "PAST_DUE" as const, currentPeriodEndsAt: "2026-10-15T03:00:00.000Z", invoiceUrl: INVOICE }
    handler({ reads: [() => reply(200, enforced(due))], checks: [() => reply(200, enforced(due))] })
    renderScreen()
    await settle()
    const pay = screen.getByRole("link", { name: /Pagar a fatura/ })
    pay.addEventListener("click", (event) => event.preventDefault())

    expect(screen.queryByRole("radio")).toBeNull()
    await user().click(pay)

    const waiting = screen.getByRole("region", { name: "Aguardando a confirmação do pagamento" })
    expect(within(waiting).getByRole("link", { name: /Abrir a fatura/ })).toHaveAttribute("href", INVOICE)
    expect(within(waiting).queryByRole("button", { name: "Escolher outro plano" })).toBeNull()
  })
})

describe("SubscribeScreen, when it cannot sell", () => {
  it("says the plan is unavailable, with no button, where this deployment has no Asaas key", async () => {
    handler({ account: () => refusal(503, "BILLING_UNAVAILABLE") })
    renderScreen()
    await settle()

    expect(screen.getByRole("status")).toHaveTextContent("A assinatura está indisponível no momento.")
    expect(screen.queryByRole("button", { name: /Assinar e pagar/ })).toBeNull()
    expect(screen.queryByLabelText("CPF ou CNPJ")).toBeNull()
  })

  it("says the plan is unavailable where the catalogue holds none on sale", async () => {
    handler({ plans: () => reply(200, { trialDays: 7, plans: [] }) })
    renderScreen()
    await settle()

    expect(screen.getByRole("heading", { level: 1, name: "Assinatura da página" })).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("A assinatura está indisponível no momento.")
    expect(screen.queryByRole("radio")).toBeNull()
  })

  it("says a read that failed as one, and asks again", async () => {
    handler({ reads: [() => refusal(500, "INTERNAL_ERROR"), () => reply(200, enforced(trialing))] })
    renderScreen()
    await settle()

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível ler a assinatura desta página.")
    await user().click(screen.getByRole("button", { name: "Tentar de novo" }))
    await settle()
    expect(screen.getAllByRole("radio")).toHaveLength(3)
  })
})
