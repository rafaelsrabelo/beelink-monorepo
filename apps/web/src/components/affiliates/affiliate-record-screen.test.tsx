// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { AffiliateProgramOverview, CommissionTable, OrderSummary, ShopAffiliate } from "@harness-monorepo/contracts"
import type { AffiliateRecordTab } from "@harness-monorepo/ui/lib/affiliates"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { AffiliateError } from "@/services/affiliates/affiliate-requests"
import { AffiliateRecordScreen } from "./affiliate-record-screen"

const mocks = vi.hoisted(() => ({ overview: vi.fn(), table: vi.fn(), one: vi.fn(), update: vi.fn(), act: vi.fn(), cancel: vi.fn(), clear: vi.fn(), orders: vi.fn(), replace: vi.fn() }))
vi.mock("@/services/affiliates/affiliate-hooks", () => ({ useAffiliateProgram: mocks.overview, useCommissionTable: mocks.table }))
vi.mock("@/services/affiliates/shop-affiliate-hooks", () => ({ useShopAffiliate: mocks.one, useUpdateAffiliate: mocks.update, useActOnAffiliate: mocks.act, useCancelAffiliateInvite: mocks.cancel }))
vi.mock("@/services/affiliates/affiliate-money-hooks", () => ({ useClearAffiliateShowcase: mocks.clear }))
vi.mock("@/services/catalog/catalog-hooks", () => ({ useProductCategories: () => ({ data: [{ id: "c1", name: "Bolsas" }] }) }))
vi.mock("@/services/orders/order-hooks", () => ({ useOrders: mocks.orders }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }))
// Their own screens, with their own reads (IMPULSEIA-107, 12/11/2026).
vi.mock("@/components/affiliates/affiliate-money-section", () => ({ AffiliateMoneySection: () => <p>saldo e extrato</p> }))
vi.mock("@/components/affiliates/affiliate-document-record", () => ({ AffiliateDocumentRecord: () => <p>documento</p> }))

const overview: AffiliateProgramOverview = {
  program: { enabled: true, attributionDays: 30, payoutDelayDays: 10, termsText: null, termsVersion: 0, updatedAt: "2026-11-11T12:00:00.000Z" },
  tables: [
    { id: "t1", name: "Padrão", defaultRateBps: 1000, isDefault: true, productRateCount: 0, categoryRateCount: 0, affiliateCount: 1, affiliate: null },
    { id: "t2", name: "Influencers", defaultRateBps: 1500, isDefault: false, productRateCount: 0, categoryRateCount: 0, affiliateCount: 0, affiliate: null },
  ],
  periods: [],
  linksLive: true,
}
const joao: ShopAffiliate = {
  id: "a1",
  name: "João Silva",
  email: "joao@exemplo.com",
  phone: null,
  cpf: null,
  slug: "joao",
  status: "ACTIVE",
  table: { id: "t1", name: "Padrão", personal: false },
  invitedAt: "2026-11-11T13:00:00.000Z",
  acceptedAt: "2026-11-11T15:00:00.000Z",
  note: null,
  pixKey: "joao@exemplo.com",
  photoUrl: null,
  tagline: null,
  termsVersion: 1,
  termsAcceptedAt: "2026-11-11T15:00:00.000Z",
  endedAt: null,
  invite: null,
  document: null,
}
const table: CommissionTable = { id: "t1", name: "Padrão", defaultRateBps: 1000, isDefault: true, rates: [{ productId: "p1", rateBps: 500 }], categoryRates: [{ categoryId: "c1", rateBps: 2000 }], affiliate: null, updatedAt: "2026-11-11T12:00:00.000Z" }
const order = { number: 7, status: "DELIVERED", placedAt: "2026-11-12T12:00:00.000Z", totalCents: 18990, deliveryFeeCents: 0, itemsCount: 2, paymentMethod: "PIX", fulfillment: { type: "PICKUP" } } as unknown as OrderSummary
const update = vi.fn()
const act = vi.fn()
const cancel = vi.fn()
const mutation = (mutate: ReturnType<typeof vi.fn>, extra: object = {}) => ({ mutate, reset: vi.fn(), isPending: false, error: null, variables: undefined, ...extra })

function renderScreen(affiliate: ShopAffiliate = joao, tab: AffiliateRecordTab = "geral") {
  mocks.one.mockReturnValue({ isPending: false, isError: false, data: affiliate })
  return render(<AffiliateRecordScreen slug="loja" affiliateId="a1" tab={tab} origin="https://beelink.com.br" locale="pt-BR" messages={ui} />)
}

beforeEach(() => {
  for (const fn of [update, act, cancel, mocks.replace]) fn.mockReset()
  mocks.overview.mockReturnValue({ isPending: false, isError: false, data: overview })
  mocks.table.mockReturnValue({ data: table })
  mocks.update.mockReturnValue(mutation(update))
  mocks.act.mockReturnValue(mutation(act))
  mocks.cancel.mockReturnValue(mutation(cancel))
  mocks.clear.mockReturnValue(mutation(vi.fn()))
  mocks.orders.mockReturnValue({ isPending: false, isError: false, isFetching: false, data: { orders: [order], total: 1, page: 1, pageSize: 20 } })
})

describe("AffiliateRecordScreen, in tabs (12/11/2026)", () => {
  it("heads with the affiliate and the link spelled with this site's origin, and opens on Geral", () => {
    renderScreen()

    expect(screen.getByRole("heading", { name: "João Silva" })).toBeInTheDocument()
    expect(screen.getByText("https://beelink.com.br/loja/joao")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Afiliados" })).toHaveAttribute("href", "/admin/loja/affiliates")
    expect(screen.getByRole("link", { name: "Geral" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: "Financeiro" })).toHaveAttribute("href", "/admin/loja/affiliates/a1?aba=financeiro")
  })

  it("edits one row in place and saves only it", async () => {
    renderScreen()

    await userEvent.click(within(screen.getByText("Anotação").closest("div")!.parentElement!).getByRole("button", { name: "Editar" }))
    await userEvent.type(screen.getByLabelText("Anotação"), "Indicou amigas")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(update).toHaveBeenCalledWith({ note: "Indicou amigas" }, expect.anything())
  })

  it("refuses a phone without its area code in its own row", async () => {
    renderScreen()

    await userEvent.click(within(screen.getByText("Telefone").closest("div")!.parentElement!).getByRole("button", { name: "Editar" }))
    await userEvent.type(screen.getByLabelText("Telefone"), "123")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(update).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toBeInTheDocument()
  })

  it("pauses at once, and asks before ending", async () => {
    renderScreen()

    await userEvent.click(screen.getByRole("button", { name: "Pausar" }))
    expect(act).toHaveBeenLastCalledWith("pause", expect.anything())

    await userEvent.click(screen.getByRole("button", { name: "Mais ações" }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Encerrar" }))
    const dialog = within(screen.getByRole("alertdialog"))
    expect(dialog.getByText("João Silva deixa de vender pela loja.")).toBeInTheDocument()
    await userEvent.click(dialog.getByRole("button", { name: "Encerrar" }))
    expect(act).toHaveBeenLastCalledWith("end", expect.anything())
  })

  it("sends an open invite again and says where, or cancels it after asking and goes back to the list", async () => {
    act.mockImplementation((_act, options: { onSuccess: () => void }) => options.onSuccess())
    cancel.mockImplementation((_none, options: { onSuccess: () => void }) => options.onSuccess())
    renderScreen({ ...joao, status: "INVITED", slug: null, acceptedAt: null, termsVersion: null, termsAcceptedAt: null, invite: { sentAt: "2026-11-11T13:00:00.000Z", expiresAt: "2026-11-18T13:00:00.000Z" } })

    expect(screen.getByText("O afiliado escolhe o nome do link ao aceitar o convite.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Reenviar convite" }))
    expect(screen.getByText(/Convite reenviado para joao@exemplo.com/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Mais ações" }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Cancelar convite" }))
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancelar convite" }))
    expect(cancel).toHaveBeenCalled()
    expect(mocks.replace).toHaveBeenCalledWith("/admin/loja/affiliates")
  })

  it("says the API's refusal of an act in words", () => {
    mocks.act.mockReturnValue(mutation(act, { error: new AffiliateError("AFFILIATE_INVITE_RECENTLY_SENT") }))
    renderScreen()

    expect(screen.getByText("O convite acabou de sair. Espere um minuto para reenviar.")).toBeInTheDocument()
  })

  it("shows on Comissão what the table pays, and saves another table once chosen", async () => {
    renderScreen(joao, "comissao")

    expect(screen.getByText("10%")).toBeInTheDocument()
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["Bolsas · 20%"])
    expect(screen.getByText("1 com percentual próprio")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Salvar" })).toBeNull()
  })

  it("lists on Pedidos the orders credited to the affiliate, each opening its page", () => {
    renderScreen(joao, "pedidos")

    expect(mocks.orders).toHaveBeenCalledWith("loja", { affiliateId: "a1", page: 1 })
    expect(screen.getByRole("heading", { name: "Pedidos pela indicação" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Abrir o pedido #7" })).toHaveAttribute("href", "/admin/loja/orders/7")
  })

  it("says on Financeiro that an invite not yet accepted has no books, and shows them once it is", () => {
    const { unmount } = renderScreen({ ...joao, status: "INVITED", slug: null, acceptedAt: null }, "financeiro")
    expect(screen.getByText("O convite ainda não foi aceito: não há saldo nem extrato.")).toBeInTheDocument()
    unmount()

    renderScreen(joao, "financeiro")
    expect(screen.getByText("saldo e extrato")).toBeInTheDocument()
  })
})
