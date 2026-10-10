// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { CashbackAdjustForm } from "./cashback-adjust-form"
import { CashbackFailed } from "./cashback-failed"
import { CashbackOwed } from "./cashback-owed"
import { CashbackSettingsForm } from "./cashback-settings-form"
import { CashbackSkeleton } from "./cashback-skeleton"
import { customer, owed, settings } from "./cashback.fixtures"
import { CustomerCashback } from "./customer-cashback"
import { OrderCashback } from "./order-cashback"

const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100).replace(/\s/g, " ")
const date = (iso: string) => iso.slice(0, 10)
const EXAMPLE = "Num pedido de R$ 100,00, o cliente ganha R$ 5,00 de cashback."

describe("CashbackOwed", () => {
  it("says what the shop owes now, what waits on deliveries and what expires within the window", async () => {
    const { container } = render(<CashbackOwed owed={owed} money={money} />)

    const figures = within(screen.getByRole("region", { name: "O que a loja deve em crédito" }))
    expect(figures.getByText("Disponível para os clientes").nextElementSibling).toHaveTextContent("R$ 1.843,50")
    expect(figures.getByText("Pendente").nextElementSibling).toHaveTextContent("R$ 421,90")
    expect(figures.getByText("Vence nos próximos 30 dias").nextElementSibling).toHaveTextContent("R$ 128,00")
    await expectNoA11yViolations(container)
  })
})

describe("CashbackSettingsForm", () => {
  it("edits every rule, reporting each change with the rest of the value as it was", async () => {
    const onChange = vi.fn()
    render(<CashbackSettingsForm value={settings} onChange={onChange} onSubmit={() => {}} example={EXAMPLE} />)

    await userEvent.click(screen.getByRole("switch", { name: "Cashback ligado" }))
    expect(onChange).toHaveBeenLastCalledWith({ ...settings, enabled: false })
    expect(screen.getByRole("switch", { name: "Cashback ligado" })).toHaveAccessibleDescription(/O crédito já dado continua valendo/)
    await userEvent.type(screen.getByLabelText("Quanto volta (%)"), "0")
    expect(onChange).toHaveBeenLastCalledWith({ ...settings, rate: "50" })
    await userEvent.click(screen.getByRole("button", { name: "Sem validade" }))
    expect(onChange).toHaveBeenLastCalledWith({ ...settings, validity: "NONE" })
    expect(screen.getByText(EXAMPLE)).toBeInTheDocument()
  })

  /** BEELINK-313: one rate for the shop, or each product's own — and then the one rate is not asked for. */
  it("chooses between one rate and by product, and asks the one rate only for the first", async () => {
    const onChange = vi.fn()
    const { rerender } = render(<CashbackSettingsForm value={settings} onChange={onChange} onSubmit={() => {}} example={EXAMPLE} />)

    await userEvent.click(screen.getByRole("button", { name: "Por produto" }))
    expect(onChange).toHaveBeenLastCalledWith({ ...settings, mode: "PRODUCT" })

    rerender(<CashbackSettingsForm value={{ ...settings, mode: "PRODUCT" }} onChange={onChange} onSubmit={() => {}} example={EXAMPLE} productsLink={<a href="/produtos">Definir nos produtos</a>} />)
    expect(screen.queryByLabelText("Quanto volta (%)")).not.toBeInTheDocument()
    expect(screen.getByText(/Produto sem percentual não gera cashback/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Definir nos produtos" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Por produto" })).toHaveAttribute("aria-pressed", "true")
  })

  it("asks for the days only while the credit expires", () => {
    const { rerender } = render(<CashbackSettingsForm value={settings} onChange={() => {}} onSubmit={() => {}} example={EXAMPLE} />)
    expect(screen.getByLabelText("Vence depois de (dias)")).toHaveValue("90")

    rerender(<CashbackSettingsForm value={{ ...settings, validity: "NONE" }} onChange={() => {}} onSubmit={() => {}} example={EXAMPLE} />)
    expect(screen.queryByLabelText("Vence depois de (dias)")).not.toBeInTheDocument()
  })

  it("says each refusal on its field, and the API's answer beside the button", async () => {
    const { container } = render(
      <CashbackSettingsForm value={settings} onChange={() => {}} onSubmit={() => {}} example={EXAMPLE} issues={{ rate: "Informe um percentual." }} error="Alguma regra está fora do permitido." />,
    )

    expect(screen.getByLabelText("Quanto volta (%)")).toHaveAccessibleDescription("Informe um percentual.")
    expect(screen.getByLabelText("Quanto volta (%)")).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByText("Alguma regra está fora do permitido.")).toHaveAttribute("aria-live", "polite")
    await expectNoA11yViolations(container)
  })

  it("submits, and says the rules were saved once they were", async () => {
    const onSubmit = vi.fn()
    render(<CashbackSettingsForm value={settings} onChange={() => {}} onSubmit={onSubmit} example={EXAMPLE} saved />)

    await userEvent.click(screen.getByRole("button", { name: "Salvar regras" }))

    expect(onSubmit).toHaveBeenCalledOnce()
    expect(screen.getByText("Regras salvas.")).toBeInTheDocument()
  })
})

describe("CustomerCashback", () => {
  it("shows the balance, what is pending, the soonest expiry and the statement, signed, newest first", async () => {
    const { container } = render(<CustomerCashback cashback={customer} money={money} date={date} onAdjust={() => {}} />)

    expect(screen.getByText("Saldo").nextElementSibling).toHaveTextContent("R$ 14,50")
    expect(screen.getByText("R$ 9,50 vence em 2026-11-02")).toBeInTheDocument()
    const lines = within(screen.getByRole("list")).getAllByRole("listitem")
    expect(lines.map((line) => line.textContent)).toEqual([
      "Ajuste2026-10-01Pedido entregue com atraso+ R$ 5,00",
      "Uso2026-09-28 · Pedido nº 34− R$ 8,00",
      "Ganho2026-09-20 · Pedido nº 31+ R$ 17,50",
    ])
    await expectNoA11yViolations(container)
  })

  it("draws the adjustment in place of its button, and says when there is nothing yet", () => {
    render(<CustomerCashback cashback={{ ...customer, entries: [], nextExpiry: null }} money={money} date={date} onAdjust={() => {}} adjustment={<p>formulário</p>} />)

    expect(screen.queryByRole("button", { name: "Ajustar saldo" })).not.toBeInTheDocument()
    expect(screen.getByText("formulário")).toBeInTheDocument()
    expect(screen.getByText("Nenhum lançamento ainda.")).toBeInTheDocument()
    expect(screen.getByText("Nenhuma parte do saldo vence.")).toBeInTheDocument()
  })
})

describe("CashbackAdjustForm", () => {
  it("gives or takes, with an amount and a reason, and says the API's refusal", async () => {
    const onChange = vi.fn()
    const onSubmit = vi.fn()
    const value = { direction: "GIVE" as const, amount: "", reason: "" }
    const { container } = render(<CashbackAdjustForm value={value} onChange={onChange} onSubmit={onSubmit} onCancel={() => {}} issues={{ reason: "Explique o ajuste." }} error="O cliente tem menos crédito do que isso." />)

    await userEvent.click(screen.getByRole("button", { name: "Tirar crédito" }))
    expect(onChange).toHaveBeenLastCalledWith({ ...value, direction: "TAKE" })
    expect(screen.getByLabelText("Motivo")).toHaveAccessibleDescription("Explique o ajuste.")
    expect(screen.getByText("O cliente tem menos crédito do que isso.")).toHaveAttribute("role", "alert")
    await userEvent.click(screen.getByRole("button", { name: "Lançar ajuste" }))
    expect(onSubmit).toHaveBeenCalledOnce()
    await expectNoA11yViolations(container)
  })
})

describe("OrderCashback", () => {
  it("says what the order earns, at its rate, and until when it is usable", async () => {
    const { container } = render(
      <OrderCashback cashback={{ earnedCents: 500, rateBps: 550, status: "AVAILABLE", remainingCents: 500, availableAt: "2026-10-01", expiresAt: "2026-12-30T12:00:00.000Z", unrecoveredCents: 0 }} money={money} date={date} now={new Date("2026-11-01T12:00:00.000Z")} />,
    )

    expect(screen.getByRole("heading", { name: "Cashback" }).nextElementSibling).toHaveTextContent("R$ 5,00")
    expect(screen.getByText("Gera 5,5% de cashback")).toBeInTheDocument()
    expect(screen.getByText("Disponível para o cliente · Vale até 2026-12-30")).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it("says what is left once the customer spent part, that all was spent, and expired once past its day", () => {
    const usable = { earnedCents: 500, rateBps: 500, status: "AVAILABLE" as const, remainingCents: 200, availableAt: "2026-10-01", expiresAt: "2026-12-30T12:00:00.000Z", unrecoveredCents: 0 }
    const now = new Date("2026-11-01T12:00:00.000Z")
    const { rerender } = render(<OrderCashback cashback={usable} money={money} date={date} now={now} />)
    expect(screen.getByText("Restam R$ 2,00 para o cliente usar.")).toBeInTheDocument()

    rerender(<OrderCashback cashback={{ ...usable, remainingCents: 0 }} money={money} date={date} now={now} />)
    expect(screen.getByText("O cliente já usou todo este crédito.")).toBeInTheDocument()
    expect(screen.queryByText(/Vale até/)).not.toBeInTheDocument()

    rerender(<OrderCashback cashback={usable} money={money} date={date} now={new Date("2027-01-01T00:00:00.000Z")} />)
    expect(screen.getByText("Vencido")).toBeInTheDocument()
    expect(screen.queryByText(/Restam/)).not.toBeInTheDocument()
  })

  /** Decided on 01/10/2026: the balance stops at zero; the shop is told what it did not get back. */
  it("says what the customer had spent of a credit taken back", () => {
    render(<OrderCashback cashback={{ earnedCents: 500, rateBps: 500, status: "VOIDED", remainingCents: 0, availableAt: null, expiresAt: null, unrecoveredCents: 200 }} money={money} date={date} />)

    expect(screen.getByText("Estornado")).toBeInTheDocument()
    expect(screen.getByText("O cliente já tinha usado R$ 2,00 deste crédito quando o pedido foi desfeito.")).toBeInTheDocument()
  })
})

describe("CashbackSkeleton", () => {
  it("holds the screen's places and says nothing to a reader", async () => {
    const { container } = render(<CashbackSkeleton />)

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true")
    await expectNoA11yViolations(container)
  })
})

describe("CashbackFailed", () => {
  it("says the read failed, in the language it is handed, and asks again", async () => {
    const onRetry = vi.fn()
    const { container } = render(<CashbackFailed onRetry={onRetry} messages={en} />)
    await expectNoA11yViolations(container)

    expect(screen.getByRole("alert")).toHaveTextContent("Could not load the cashback.")
    await userEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
