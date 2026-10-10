// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { CashbackOverview } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { CashbackError } from "@/services/cashback/cashback-requests"
import { CashbackScreen } from "./cashback-screen"

const mocks = vi.hoisted(() => ({ overview: vi.fn(), save: vi.fn() }))
vi.mock("@/services/cashback/cashback-hooks", () => ({ useCashback: mocks.overview, useSaveCashback: mocks.save }))

const overview: CashbackOverview = {
  settings: { enabled: true, mode: "STORE", rateBps: 500, expiresAfterDays: 90, minSubtotalCents: 0, maxRedeemBps: 10000, updatedAt: "2026-10-01T12:00:00.000Z" },
  owed: { availableCents: 12_345, pendingCents: 500, expiringSoonCents: 0, expiringSoonDays: 30 },
}
const mutate = vi.fn()
const flat = (text: string | null | undefined) => text?.replace(/\s/g, " ")

function saving(state: { error?: Error | null; isSuccess?: boolean } = {}) {
  mocks.save.mockReturnValue({ mutate, reset: vi.fn(), isPending: false, error: state.error ?? null, isSuccess: state.isSuccess ?? false })
}

beforeEach(() => {
  mutate.mockReset()
  mocks.overview.mockReturnValue({ isPending: false, isError: false, data: overview })
  saving()
})

describe("CashbackScreen (BEELINK-242)", () => {
  it("shows what the shop owes over its rules as saved, with the example they give", () => {
    render(<CashbackScreen slug="loja" locale="pt-BR" messages={ui} />)

    expect(screen.getByRole("heading", { level: 1, name: "Cashback" })).toBeInTheDocument()
    expect(flat(screen.getByText("Disponível para os clientes").nextElementSibling?.textContent)).toBe("R$ 123,45")
    expect(screen.getByLabelText("Quanto volta (%)")).toHaveValue("5")
    expect(flat(screen.getByText(/^Num pedido de/).textContent)).toBe("Num pedido de R$ 100,00, o cliente ganha R$ 5,00 de cashback, para usar em até 90 dias depois da entrega.")
  })

  it("follows the example as the rate is typed, and saves the rules in the API's units", async () => {
    render(<CashbackScreen slug="loja" locale="pt-BR" messages={ui} />)

    await userEvent.clear(screen.getByLabelText("Quanto volta (%)"))
    await userEvent.type(screen.getByLabelText("Quanto volta (%)"), "7,5")
    expect(flat(screen.getByText(/^Num pedido de/).textContent)).toContain("o cliente ganha R$ 7,50 de cashback")

    await userEvent.click(screen.getByRole("button", { name: "Salvar regras" }))
    expect(mutate).toHaveBeenCalledWith({ enabled: true, mode: "STORE", rateBps: 750, expiresAfterDays: 90, minSubtotalCents: 0, maxRedeemBps: 10000 }, expect.anything())
  })

  /** BEELINK-313 */
  it("saves giving it by product, with the way to the products and no sum for an example", async () => {
    render(<CashbackScreen slug="loja" locale="pt-BR" messages={ui} />)

    await userEvent.click(screen.getByRole("button", { name: "Por produto" }))
    expect(screen.queryByLabelText("Quanto volta (%)")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Definir nos produtos" })).toHaveAttribute("href", "/admin/loja/products")
    expect(screen.getByText(/^Em cada produto, o cliente ganha o percentual definido no cadastro dele/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Salvar regras" }))
    expect(mutate).toHaveBeenCalledWith({ enabled: true, mode: "PRODUCT", rateBps: 500, expiresAfterDays: 90, minSubtotalCents: 0, maxRedeemBps: 10000 }, expect.anything())
  })

  it("says what to correct before asking the API, and sends nothing", async () => {
    render(<CashbackScreen slug="loja" locale="pt-BR" messages={ui} />)

    await userEvent.clear(screen.getByLabelText("Quanto volta (%)"))
    await userEvent.click(screen.getByRole("button", { name: "Salvar regras" }))

    expect(screen.getByLabelText("Quanto volta (%)")).toHaveAccessibleDescription(ui.cashback.issues.rate)
    expect(mutate).not.toHaveBeenCalled()
  })

  it("says the API's refusal in words, and that the rules were saved once they were", () => {
    saving({ error: new CashbackError("CASHBACK_SETTINGS_INVALID") })
    const { rerender } = render(<CashbackScreen slug="loja" locale="pt-BR" messages={ui} />)
    expect(screen.getByText(ui.cashback.errors.CASHBACK_SETTINGS_INVALID)).toBeInTheDocument()

    saving({ isSuccess: true })
    rerender(<CashbackScreen slug="loja" locale="pt-BR" messages={ui} />)
    expect(screen.getByText("Regras salvas.")).toBeInTheDocument()
  })

  it("says the read failed, never as rules switched off", () => {
    mocks.overview.mockReturnValue({ isPending: false, isError: true, refetch: vi.fn() })
    render(<CashbackScreen slug="loja" locale="pt-BR" messages={ui} />)

    expect(screen.getByRole("alert")).toHaveTextContent(ui.cashback.failed)
    expect(screen.queryByRole("button", { name: "Salvar regras" })).not.toBeInTheDocument()
  })
})
