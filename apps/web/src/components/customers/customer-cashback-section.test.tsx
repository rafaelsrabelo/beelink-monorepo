// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { CustomerCashback } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { CashbackError } from "@/services/cashback/cashback-requests"
import { CustomerCashbackSection } from "./customer-cashback-section"

const mocks = vi.hoisted(() => ({ cashback: vi.fn(), adjust: vi.fn(), mutate: vi.fn() }))
vi.mock("@/services/cashback/cashback-hooks", () => ({ useCustomerCashback: mocks.cashback, useAdjustCashback: mocks.adjust }))

const page = (number: number): CustomerCashback => ({
  balanceCents: 1000,
  pendingCents: 0,
  nextExpiry: null,
  credits: [],
  entries: [{ id: `e${number}`, kind: "EARN", amountCents: 1000, orderNumber: number, reason: null, createdAt: "2026-10-01T12:00:00.000Z" }],
  total: 45,
  page: number,
  pageSize: 20,
})

function adjusting(error: Error | null = null) {
  mocks.adjust.mockReturnValue({ mutate: mocks.mutate, reset: vi.fn(), isPending: false, error })
}

beforeEach(() => {
  mocks.mutate.mockReset()
  mocks.cashback.mockImplementation((_slug: string, _id: string, number: number) => ({ isPending: false, isError: false, isFetching: false, data: page(number) }))
  adjusting()
})

describe("CustomerCashbackSection (BEELINK-242)", () => {
  it("takes credit as a negative amount, then closes the form and shows the statement from its first page", async () => {
    render(<CustomerCashbackSection slug="loja" customerId="c1" locale="pt-BR" messages={ui} />)
    await userEvent.click(screen.getByRole("button", { name: "Próxima" }))
    expect(mocks.cashback).toHaveBeenLastCalledWith("loja", "c1", 2)

    await userEvent.click(screen.getByRole("button", { name: "Ajustar saldo" }))
    await userEvent.click(screen.getByRole("button", { name: "Tirar crédito" }))
    await userEvent.type(screen.getByLabelText("Valor (R$)"), "5,00")
    await userEvent.type(screen.getByLabelText("Motivo"), "Lançado em dobro")
    await userEvent.click(screen.getByRole("button", { name: "Lançar ajuste" }))

    expect(mocks.mutate).toHaveBeenCalledWith({ amountCents: -500, reason: "Lançado em dobro" }, expect.anything())
    const { onSuccess } = mocks.mutate.mock.calls[0]![1] as { onSuccess: () => void }
    await vi.waitFor(() => onSuccess())
    expect(await screen.findByRole("button", { name: "Ajustar saldo" })).toBeInTheDocument()
    expect(mocks.cashback).toHaveBeenLastCalledWith("loja", "c1", 1)
  })

  it("asks for what is missing before posting, and says the API's refusal in words", async () => {
    adjusting(new CashbackError("CASHBACK_BALANCE_INSUFFICIENT"))
    render(<CustomerCashbackSection slug="loja" customerId="c1" locale="pt-BR" messages={ui} />)
    await userEvent.click(screen.getByRole("button", { name: "Ajustar saldo" }))
    await userEvent.click(screen.getByRole("button", { name: "Lançar ajuste" }))

    expect(screen.getByLabelText("Motivo")).toHaveAccessibleDescription(ui.cashback.issues.reason)
    expect(mocks.mutate).not.toHaveBeenCalled()
    expect(screen.getByText("O cliente tem menos crédito do que isso.")).toBeInTheDocument()
  })
})
