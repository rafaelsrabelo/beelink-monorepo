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
import { CommissionTablesScreen } from "./commission-tables-screen"

const mocks = vi.hoisted(() => ({ overview: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() }))
vi.mock("@/services/affiliates/affiliate-hooks", () => ({
  useAffiliateProgram: mocks.overview,
  useCreateCommissionTable: mocks.create,
  useUpdateCommissionTable: mocks.update,
  useDeleteCommissionTable: mocks.remove,
}))

const overview: AffiliateProgramOverview = {
  program: { enabled: true, attributionDays: 30, payoutDelayDays: 10, termsText: null, termsVersion: 0, updatedAt: "2026-11-11T12:00:00.000Z" },
  tables: [
    { id: "t1", name: "Padrão", defaultRateBps: 1000, isDefault: true, productRateCount: 1, categoryRateCount: 0, affiliateCount: 2 },
    { id: "t2", name: "Influencers", defaultRateBps: 1500, isDefault: false, productRateCount: 0, categoryRateCount: 0, affiliateCount: 0 },
  ],
  periods: [],
  linksLive: true,
}
const create = vi.fn()
const update = vi.fn()
const remove = vi.fn()

function mutation(mutate: ReturnType<typeof vi.fn>, error: Error | null = null) {
  return { mutate, reset: vi.fn(), isPending: false, error, variables: undefined }
}

beforeEach(() => {
  for (const fn of [create, update, remove]) fn.mockReset()
  mocks.overview.mockReturnValue({ isPending: false, isError: false, data: overview })
  mocks.create.mockReturnValue(mutation(create))
  mocks.update.mockReturnValue(mutation(update))
  mocks.remove.mockReturnValue(mutation(remove))
})

describe("CommissionTablesScreen (IMPULSEIA-102)", () => {
  it("creates a table from the dialog, in the API's units", async () => {
    render(<CommissionTablesScreen slug="loja" locale="pt-BR" messages={ui} />)

    expect(screen.getByRole("link", { name: "Personalizar os percentuais de Influencers" })).toHaveAttribute("href", "/admin/loja/affiliates/tables/t2")
    await userEvent.click(screen.getByRole("button", { name: "Nova tabela" }))
    const dialog = within(screen.getByRole("dialog", { name: "Nova tabela" }))
    await userEvent.type(dialog.getByLabelText("Nome"), "Amigos")
    await userEvent.type(dialog.getByLabelText("Comissão em todos os produtos (%)"), "7,5")
    await userEvent.click(dialog.getByRole("button", { name: "Criar tabela" }))
    expect(create).toHaveBeenCalledWith({ name: "Amigos", defaultRateBps: 750 }, expect.anything())
  })

  it("edits a table starting from what it holds, and refuses a rate out of range before asking", async () => {
    render(<CommissionTablesScreen slug="loja" locale="pt-BR" messages={ui} />)

    await userEvent.click(screen.getByRole("button", { name: "Editar Padrão" }))
    const dialog = within(screen.getByRole("dialog", { name: "Editar tabela" }))
    expect(dialog.getByLabelText("Nome")).toHaveValue("Padrão")
    expect(dialog.getByLabelText("Comissão em todos os produtos (%)")).toHaveValue("10")

    await userEvent.clear(dialog.getByLabelText("Comissão em todos os produtos (%)"))
    await userEvent.type(dialog.getByLabelText("Comissão em todos os produtos (%)"), "120")
    await userEvent.click(dialog.getByRole("button", { name: "Salvar" }))
    expect(dialog.getByText("Informe um percentual de 0% a 100%.")).toBeInTheDocument()
    expect(update).not.toHaveBeenCalled()

    await userEvent.clear(dialog.getByLabelText("Comissão em todos os produtos (%)"))
    await userEvent.type(dialog.getByLabelText("Comissão em todos os produtos (%)"), "8")
    await userEvent.click(dialog.getByRole("button", { name: "Salvar" }))
    expect(update).toHaveBeenCalledWith({ tableId: "t1", payload: { name: "Padrão", defaultRateBps: 800 } }, expect.anything())
  })

  it("asks before deleting a table", async () => {
    render(<CommissionTablesScreen slug="loja" locale="pt-BR" messages={ui} />)

    await userEvent.click(screen.getByRole("button", { name: "Apagar Influencers" }))
    const question = within(screen.getByRole("alertdialog"))
    expect(question.getByText("Apagar a tabela Influencers?")).toBeInTheDocument()
    await userEvent.click(question.getByRole("button", { name: "Excluir" }))
    expect(remove).toHaveBeenCalledWith("t2", expect.anything())
  })

  it("says the API's refusal of a name taken", async () => {
    mocks.create.mockReturnValue(mutation(create, new AffiliateError("COMMISSION_TABLE_NAME_TAKEN")))
    render(<CommissionTablesScreen slug="loja" locale="pt-BR" messages={ui} />)

    await userEvent.click(screen.getByRole("button", { name: "Nova tabela" }))
    expect(within(screen.getByRole("dialog", { name: "Nova tabela" })).getByText("Já existe uma tabela com esse nome.")).toBeInTheDocument()
  })
})
