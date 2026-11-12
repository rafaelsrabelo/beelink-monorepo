// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { AffiliateProgramOverview } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { AffiliateError } from "@/services/affiliates/affiliate-requests"
import { AffiliateSettingsScreen } from "./affiliate-settings-screen"

const mocks = vi.hoisted(() => ({ overview: vi.fn(), save: vi.fn() }))
vi.mock("@/services/affiliates/affiliate-hooks", () => ({ useAffiliateProgram: mocks.overview, useSaveAffiliateProgram: mocks.save }))

const overview: AffiliateProgramOverview = {
  program: { enabled: false, attributionDays: 30, payoutDelayDays: 10, termsText: null, termsVersion: 0, updatedAt: "2026-11-11T12:00:00.000Z" },
  tables: [{ id: "t1", name: "Padrão", defaultRateBps: 1000, isDefault: true, productRateCount: 0, affiliateCount: 0 }],
  periods: [
    { firstDay: "2026-11-01", lastDay: "2026-11-10", dueOn: "2026-11-20" },
    { firstDay: "2026-11-11", lastDay: "2026-11-20", dueOn: "2026-11-30" },
    { firstDay: "2026-11-21", lastDay: "2026-11-30", dueOn: "2026-12-10" },
  ],
  linksLive: true,
}
const mutate = vi.fn()

function saving(state: { error?: Error | null; isSuccess?: boolean } = {}) {
  mocks.save.mockReturnValue({ mutate, reset: vi.fn(), isPending: false, error: state.error ?? null, isSuccess: state.isSuccess ?? false })
}

const calendar = () => within(screen.getByRole("region", { name: "Calendário deste mês" })).getAllByRole("listitem").map((row) => row.textContent)

beforeEach(() => {
  mutate.mockReset()
  mocks.overview.mockReturnValue({ isPending: false, isError: false, data: overview })
  saving()
})

describe("AffiliateSettingsScreen (IMPULSEIA-102)", () => {
  it("shows the rules as saved, the month's calendar and the sections", () => {
    render(<AffiliateSettingsScreen slug="loja" locale="pt-BR" messages={ui} />)

    expect(screen.getByRole("heading", { level: 1, name: "Afiliados" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Tabelas" })).toHaveAttribute("href", "/admin/loja/affiliates/tables")
    expect(screen.getByRole("switch", { name: "Programa ligado" })).not.toBeChecked()
    expect(screen.getByLabelText("A visita pelo link vale por")).toHaveValue("30")
    expect(calendar()).toEqual([
      "Entregues de 1 de nov. a 10 de nov. → pagar em 20 de nov.",
      "Entregues de 11 de nov. a 20 de nov. → pagar em 30 de nov.",
      "Entregues de 21 de nov. a 30 de nov. → pagar em 10 de dez.",
    ])
  })

  it("follows the delay as it is typed, and saves the rules in the API's units", async () => {
    render(<AffiliateSettingsScreen slug="loja" locale="pt-BR" messages={ui} />)

    await userEvent.clear(screen.getByLabelText("Prazo para pagar"))
    await userEvent.type(screen.getByLabelText("Prazo para pagar"), "5")
    expect(calendar()[0]).toBe("Entregues de 1 de nov. a 10 de nov. → pagar em 15 de nov.")

    await userEvent.click(screen.getByRole("switch", { name: "Programa ligado" }))
    await userEvent.type(screen.getByLabelText("Termos do programa"), "Pagamos por Pix.")
    await userEvent.click(screen.getByRole("button", { name: "Salvar configurações" }))
    expect(mutate).toHaveBeenCalledWith({ enabled: true, attributionDays: 30, payoutDelayDays: 5, termsText: "Pagamos por Pix." }, expect.anything())
  })

  it("says what to correct before asking the API, and sends nothing", async () => {
    render(<AffiliateSettingsScreen slug="loja" locale="pt-BR" messages={ui} />)

    await userEvent.clear(screen.getByLabelText("A visita pelo link vale por"))
    await userEvent.click(screen.getByRole("button", { name: "Salvar configurações" }))
    expect(screen.getByText("Informe de 1 a 90 dias.")).toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
  })

  it("says the API's refusal in words", () => {
    saving({ error: new AffiliateError("AFFILIATE_PROGRAM_INVALID") })
    render(<AffiliateSettingsScreen slug="loja" locale="pt-BR" messages={ui} />)

    expect(screen.getByText("Alguma configuração está fora do permitido. Confira os campos.")).toBeInTheDocument()
  })

  it("holds the place while reading, and offers to read again when it fails", async () => {
    const refetch = vi.fn()
    mocks.overview.mockReturnValue({ isPending: true, isError: false })
    const { rerender } = render(<AffiliateSettingsScreen slug="loja" locale="pt-BR" messages={ui} />)
    expect(screen.queryByRole("switch")).not.toBeInTheDocument()

    mocks.overview.mockReturnValue({ isPending: false, isError: true, refetch })
    rerender(<AffiliateSettingsScreen slug="loja" locale="pt-BR" messages={ui} />)
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})
