// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { AffiliateProgramOverview, OrderAffiliate } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { AffiliateError } from "@/services/affiliates/affiliate-requests"
import { OrderAffiliateSection } from "./order-affiliate-section"

const mocks = vi.hoisted(() => ({ read: vi.fn(), program: vi.fn(), people: vi.fn(), change: vi.fn() }))
vi.mock("@/services/affiliates/affiliate-money-hooks", () => ({ useOrderAffiliate: mocks.read, useChangeOrderAffiliate: mocks.change }))
vi.mock("@/services/affiliates/affiliate-hooks", () => ({ useAffiliateProgram: mocks.program }))
vi.mock("@/services/affiliates/shop-affiliate-hooks", () => ({ useShopAffiliates: mocks.people }))

const overview = (enabled: boolean, linksLive = true): AffiliateProgramOverview => ({
  program: { enabled, attributionDays: 30, payoutDelayDays: 10, termsText: null, termsVersion: 0, updatedAt: "2026-11-11T12:00:00.000Z" },
  tables: [],
  periods: [],
  linksLive,
})
const credited: OrderAffiliate = {
  affiliate: { id: "a1", name: "João Silva", slug: "joao", status: "ACTIVE" },
  commission: { status: "PENDING", baseCents: 10_000, commissionCents: 1000, tableName: "Padrão", zeroReason: null, dueOn: null, availableAt: null },
  changes: [],
  refundedCents: 0,
  changeable: true,
}
const nobody: OrderAffiliate = { affiliate: null, commission: null, changes: [], refundedCents: 0, changeable: true }
const mutate = vi.fn()

function renderSection(read: OrderAffiliate, program = overview(true), error: Error | null = null) {
  mocks.read.mockReturnValue({ isPending: false, isError: false, data: read })
  mocks.program.mockReturnValue({ isPending: false, isError: false, data: program })
  mocks.change.mockReturnValue({ mutate, reset: vi.fn(), isPending: false, error })
  return render(<OrderAffiliateSection slug="loja" number={12} locale="pt-BR" messages={ui} />)
}

beforeEach(() => {
  mutate.mockReset()
  mocks.people.mockReturnValue({ data: { affiliates: [{ id: "a1", name: "João Silva" }, { id: "a2", name: "Maria Souza" }] } })
})

describe("OrderAffiliateSection (IMPULSEIA-107)", () => {
  it("says whom the order is credited to, and moves it with a reason", async () => {
    renderSection(credited)

    const card = within(screen.getByRole("region", { name: "Afiliado" }))
    expect(card.getByRole("link", { name: "Abrir a ficha de João Silva" })).toHaveAttribute("href", "/admin/loja/affiliates/a1")
    expect(card.getByText("Aguardando a entrega")).toBeInTheDocument()
    await userEvent.click(card.getByRole("button", { name: "Trocar afiliado" }))

    const dialog = within(screen.getByRole("dialog", { name: "Afiliado do pedido" }))
    await userEvent.click(dialog.getByRole("button", { name: "Salvar" }))
    expect(mutate).not.toHaveBeenCalled()
    expect(dialog.getByText(ui.affiliates.moneyIssues.reason)).toBeInTheDocument()
    await userEvent.type(dialog.getByLabelText("Motivo"), "Veio pela Maria")
    await userEvent.click(dialog.getByRole("button", { name: "Salvar" }))
    expect(mutate).toHaveBeenCalledWith({ affiliateId: "a1", reason: "Veio pela Maria" }, expect.anything())
  })

  it("says nothing of an order credited to nobody outside a programme, or before crediting is live", () => {
    const { container } = renderSection(nobody, overview(false))
    expect(container).toBeEmptyDOMElement()

    renderSection(nobody, overview(true, false))
    expect(screen.queryByRole("region", { name: "Afiliado" })).not.toBeInTheDocument()
  })

  it("offers to take an order off its affiliate even with the programme off", () => {
    renderSection(credited, overview(false))

    expect(screen.getByRole("button", { name: "Trocar afiliado" })).toBeInTheDocument()
  })

  it("says the API's refusal in words", async () => {
    renderSection(credited, overview(true), new AffiliateError("AFFILIATE_COMMISSION_NOT_PENDING"))
    await userEvent.click(screen.getByRole("button", { name: "Trocar afiliado" }))

    expect(screen.getByText(ui.affiliates.errors.AFFILIATE_COMMISSION_NOT_PENDING)).toBeInTheDocument()
  })
})
