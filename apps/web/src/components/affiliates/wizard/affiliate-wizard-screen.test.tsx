// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { AffiliateProgramOverview, CommissionTable, Product, ProductCategory } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { AffiliateWizardScreen } from "./affiliate-wizard-screen"

const mocks = vi.hoisted(() => ({ invite: vi.fn(), stage: vi.fn() }))

const padrao: CommissionTable = { id: "t1", name: "Padrão", defaultRateBps: 1000, isDefault: true, rates: [], categoryRates: [], affiliate: null, updatedAt: "2026-11-12T10:00:00.000Z" }
const overview: AffiliateProgramOverview = {
  program: { enabled: true, attributionDays: 30, payoutDelayDays: 10, termsText: null, termsVersion: 0, updatedAt: "2026-11-12T10:00:00.000Z" },
  tables: [
    { id: "t1", name: "Padrão", defaultRateBps: 1000, isDefault: true, productRateCount: 0, categoryRateCount: 0, affiliateCount: 0, affiliate: null },
    { id: "t9", name: "Comissão de Ana", defaultRateBps: 2000, isDefault: false, productRateCount: 0, categoryRateCount: 0, affiliateCount: 1, affiliate: { id: "a9", name: "Ana" } },
  ],
  periods: [],
  linksLive: true,
}
const categories = [{ id: "c1", name: "Whey Protein" }] as ProductCategory[]
const products = [{ id: "p1", name: "Whey Isolado 900 g", priceCents: 18_990, category: { id: "c1" } }] as Product[]

vi.mock("@/services/affiliates/affiliate-hooks", () => ({
  useAffiliateProgram: () => ({ data: overview, isError: false, refetch: vi.fn() }),
  useCommissionTable: (_slug: string, tableId: string | undefined) => ({ data: tableId === "t1" ? padrao : undefined, isError: false, refetch: vi.fn() }),
}))
vi.mock("@/services/catalog/catalog-hooks", () => ({
  useProductCategories: () => ({ data: categories, isError: false, refetch: vi.fn() }),
  useWholeProductList: () => ({ data: products, isError: false, refetch: vi.fn() }),
}))
vi.mock("@/services/affiliates/shop-affiliate-hooks", () => ({ useInviteAffiliate: () => ({ mutate: mocks.invite, reset: vi.fn(), isPending: false, error: null }) }))
vi.mock("@/services/affiliates/affiliate-document-hooks", () => ({ useStageAffiliateDocument: () => ({ mutateAsync: mocks.stage }) }))

beforeEach(() => {
  mocks.invite.mockReset()
  mocks.invite.mockImplementation((payload: { email: string }, options: { onSuccess: (affiliate: object) => void }) => options.onSuccess({ id: "a1", email: payload.email }))
  mocks.stage.mockReset()
  let next = 0
  mocks.stage.mockImplementation(async () => ({ id: `u${(next += 1)}` }))
})

async function fillPerson() {
  await userEvent.type(screen.getByLabelText(/Nome/), "João Silva")
  await userEvent.type(screen.getByLabelText(/E-mail/), "Joao@Exemplo.com")
  await userEvent.type(screen.getByLabelText(/Telefone/), "85999994321")
  await userEvent.type(screen.getByLabelText(/CPF/), "52998224725")
  await userEvent.click(screen.getByRole("button", { name: "Continuar" }))
}

const next = () => userEvent.click(screen.getByRole("button", { name: "Continuar" }))

describe("AffiliateWizardScreen (the user's design, 12/11/2026)", () => {
  it("says under each field what step one is missing, and goes nowhere", async () => {
    render(<AffiliateWizardScreen slug="loja" locale="pt-BR" messages={ui} />)

    await next()
    expect(screen.getByRole("heading", { name: "Quem você quer convidar?" })).toBeInTheDocument()
    expect(screen.getByLabelText(/CPF/)).toHaveAccessibleDescription(ui.affiliates.affiliateIssues.cpf)
    expect(screen.getByLabelText(/Telefone/)).toHaveAccessibleDescription(ui.affiliates.affiliateIssues.phone)
  })

  it("invites on the shared table it started from when nothing changed, with no document, and says where it went", async () => {
    render(<AffiliateWizardScreen slug="loja" locale="pt-BR" messages={ui} />)

    await fillPerson()
    expect(screen.getByRole("heading", { name: "Monte a tabela de comissão" })).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Partir de" })).toHaveTextContent("Padrão · 10%")
    await next()
    expect(screen.getByRole("heading", { name: "Anexe o documento" })).toBeInTheDocument()
    await next()
    expect(screen.getByText("Igual à tabela Padrão")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Enviar convite" }))

    expect(mocks.invite).toHaveBeenCalledWith({ name: "João Silva", email: "joao@exemplo.com", phone: "(85) 99999-4321", cpf: "52998224725", tableId: "t1", note: null }, expect.anything())
    expect(screen.getByRole("heading", { name: "Convite enviado" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ver afiliado" })).toHaveAttribute("href", "/admin/loja/affiliates/a1")
  })

  it("makes the commission the affiliate's own on any change, and sends the document's photos once both are up", async () => {
    render(<AffiliateWizardScreen slug="loja" locale="pt-BR" messages={ui} />)

    await fillPerson()
    await userEvent.click(screen.getByRole("button", { name: "Produtos de Whey Protein" }))
    await userEvent.click(screen.getByRole("button", { name: "Personalizar: Whey Isolado 900 g" }))
    await userEvent.click(screen.getAllByRole("button", { name: "Aumentar" }).at(-1)!)
    await next()

    await userEvent.upload(screen.getByLabelText(/Arraste a foto: frente/), new File(["f"], "frente.jpg", { type: "image/jpeg" }))
    await next()
    expect(screen.getByRole("alert")).toHaveTextContent(ui.affiliates.wizard.document.incomplete)
    await userEvent.upload(screen.getByLabelText(/Arraste a foto: verso/), new File(["v"], "verso.pdf", { type: "application/pdf" }))
    await next()
    await userEvent.click(screen.getByRole("button", { name: "Enviar convite" }))

    expect(mocks.invite).toHaveBeenCalledWith(
      expect.objectContaining({
        commission: { defaultRateBps: 1000, categoryRates: [], productRates: [{ productId: "p1", rateBps: 1100 }] },
        document: { type: "RG", frontUploadId: "u1", backUploadId: "u2" },
      }),
      expect.anything(),
    )
  })

  it("goes back to a done step from the stepper, keeping what was typed", async () => {
    render(<AffiliateWizardScreen slug="loja" locale="pt-BR" messages={ui} />)

    await fillPerson()
    await userEvent.click(screen.getByRole("button", { name: /Dados do afiliado/ }))
    expect(screen.getByLabelText(/Nome/)).toHaveValue("João Silva")
  })
})
