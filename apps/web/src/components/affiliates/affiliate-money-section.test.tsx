// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { AffiliateStatement } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { AffiliateError } from "@/services/affiliates/affiliate-requests"
import { AffiliateMoneySection } from "./affiliate-money-section"

const mocks = vi.hoisted(() => ({ statement: vi.fn(), adjust: vi.fn(), pay: vi.fn() }))
vi.mock("@/services/affiliates/affiliate-money-hooks", () => ({ useAffiliateStatement: mocks.statement, useAdjustAffiliate: mocks.adjust, usePayAffiliate: mocks.pay }))

const statement: AffiliateStatement = {
  pendingCents: 4500,
  availableCents: 21_000,
  entries: [{ id: "e1", kind: "RELEASED", amountCents: 21_000, orderNumber: 12, reason: null, payout: null, createdAt: "2026-11-20T12:00:00.000Z" }],
  total: 1,
  page: 1,
  pageSize: 20,
}
const adjust = vi.fn()
const pay = vi.fn()
const mutation = (mutate: ReturnType<typeof vi.fn>, error: Error | null = null) => ({ mutate, reset: vi.fn(), isPending: false, error })

function renderSection(read: AffiliateStatement = statement, payError: Error | null = null) {
  mocks.statement.mockReturnValue({ isPending: false, isError: false, data: read })
  mocks.pay.mockReturnValue(mutation(pay, payError))
  return render(<AffiliateMoneySection slug="loja" affiliateId="a1" pixKey="joao@pix.com" locale="pt-BR" messages={ui} />)
}

beforeEach(() => {
  adjust.mockReset()
  pay.mockReset()
  mocks.adjust.mockReturnValue(mutation(adjust))
})

describe("AffiliateMoneySection (IMPULSEIA-107)", () => {
  it("shows the balances and the statement, and leads to the affiliate's orders", () => {
    renderSection()

    expect(screen.getByText("Disponível para pagar")).toBeInTheDocument()
    expect(screen.getByText("Pedido #12", { exact: false })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ver os pedidos deste afiliado" })).toHaveAttribute("href", "/admin/loja/orders?affiliate=a1")
  })

  it("records a payout, starting at what is available and by Pix", async () => {
    renderSection()
    await userEvent.click(screen.getByRole("button", { name: "Registrar pagamento" }))

    const dialog = within(screen.getByRole("dialog", { name: "Registrar pagamento" }))
    expect(dialog.getByLabelText("Valor (R$)")).toHaveValue("210,00")
    expect(dialog.getByText("Chave Pix do afiliado: joao@pix.com")).toBeInTheDocument()
    await userEvent.click(dialog.getByRole("button", { name: "Registrar" }))
    expect(pay).toHaveBeenCalledWith(expect.objectContaining({ amountCents: 21_000, method: "PIX", note: null }), expect.anything())
  })

  it("adjusts either way, refusing one with no reason before asking", async () => {
    renderSection()
    await userEvent.click(screen.getByRole("button", { name: "Ajustar saldo" }))

    const dialog = within(screen.getByRole("dialog", { name: "Ajustar saldo" }))
    await userEvent.click(dialog.getByRole("radio", { name: "Descontar" }))
    await userEvent.type(dialog.getByLabelText("Valor (R$)"), "10")
    await userEvent.click(dialog.getByRole("button", { name: "Ajustar" }))
    expect(adjust).not.toHaveBeenCalled()
    await userEvent.type(dialog.getByLabelText("Motivo"), "Devolução")
    await userEvent.click(dialog.getByRole("button", { name: "Ajustar" }))
    expect(adjust).toHaveBeenCalledWith({ amountCents: -1000, reason: "Devolução" }, expect.anything())
  })

  it("offers no payout on a balance below zero, and says the API's refusal of one in words", async () => {
    renderSection({ ...statement, availableCents: -500 })
    expect(screen.getByRole("button", { name: "Registrar pagamento" })).toBeDisabled()
    expect(screen.getByText(/o próximo pagamento desconta/)).toBeInTheDocument()
  })

  it("says why the API refused a payout", async () => {
    renderSection(statement, new AffiliateError("AFFILIATE_PAYOUT_EXCEEDS_BALANCE"))
    await userEvent.click(screen.getByRole("button", { name: "Registrar pagamento" }))

    expect(screen.getByText(ui.affiliates.errors.AFFILIATE_PAYOUT_EXCEEDS_BALANCE)).toBeInTheDocument()
  })
})
