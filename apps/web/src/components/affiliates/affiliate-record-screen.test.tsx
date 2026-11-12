// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { AffiliateProgramOverview, ShopAffiliate } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { AffiliateError } from "@/services/affiliates/affiliate-requests"
import { AffiliateRecordScreen } from "./affiliate-record-screen"

const mocks = vi.hoisted(() => ({ overview: vi.fn(), one: vi.fn(), update: vi.fn(), act: vi.fn(), cancel: vi.fn(), replace: vi.fn() }))
vi.mock("@/services/affiliates/affiliate-hooks", () => ({ useAffiliateProgram: mocks.overview, useCommissionTable: () => ({ data: undefined }) }))
vi.mock("@/services/affiliates/shop-affiliate-hooks", () => ({ useShopAffiliate: mocks.one, useUpdateAffiliate: mocks.update, useActOnAffiliate: mocks.act, useCancelAffiliateInvite: mocks.cancel }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }))
// Their own screens, with their own reads (IMPULSEIA-107).
vi.mock("@/components/affiliates/affiliate-money-section", () => ({ AffiliateMoneySection: () => null }))
vi.mock("@/components/affiliates/affiliate-showcase-section", () => ({ AffiliateShowcaseSection: () => null }))
vi.mock("@/components/affiliates/affiliate-document-record", () => ({ AffiliateDocumentRecord: () => null }))

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
const update = vi.fn()
const act = vi.fn()
const cancel = vi.fn()
const mutation = (mutate: ReturnType<typeof vi.fn>, extra: object = {}) => ({ mutate, reset: vi.fn(), isPending: false, error: null, variables: undefined, ...extra })

function renderScreen(affiliate: ShopAffiliate = joao) {
  mocks.one.mockReturnValue({ isPending: false, isError: false, data: affiliate })
  return render(<AffiliateRecordScreen slug="loja" affiliateId="a1" origin="https://beelink.com.br" locale="pt-BR" messages={ui} />)
}

beforeEach(() => {
  for (const fn of [update, act, cancel, mocks.replace]) fn.mockReset()
  mocks.overview.mockReturnValue({ isPending: false, isError: false, data: overview })
  mocks.update.mockReturnValue(mutation(update))
  mocks.act.mockReturnValue(mutation(act))
  mocks.cancel.mockReturnValue(mutation(cancel))
})

describe("AffiliateRecordScreen (IMPULSEIA-104)", () => {
  it("shows the affiliate's link in the shop window, spelled with this site's origin", () => {
    renderScreen()

    expect(screen.getByRole("heading", { name: "João Silva" })).toBeInTheDocument()
    expect(screen.getByText("https://beelink.com.br/loja/joao")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Afiliados" })).toHaveAttribute("href", "/admin/loja/affiliates")
  })

  it("saves only what changed, and nothing while nothing did", async () => {
    renderScreen()

    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled()
    await userEvent.type(screen.getByLabelText("Anotação"), "Indicou amigas")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(update).toHaveBeenCalledWith({ note: "Indicou amigas" }, expect.anything())
  })

  it("pauses at once, and asks before ending", async () => {
    renderScreen()

    await userEvent.click(screen.getByRole("button", { name: "Pausar" }))
    expect(act).toHaveBeenLastCalledWith("pause", expect.anything())

    await userEvent.click(screen.getByRole("button", { name: "Encerrar" }))
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

    await userEvent.click(screen.getByRole("button", { name: "Cancelar convite" }))
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancelar convite" }))
    expect(cancel).toHaveBeenCalled()
    expect(mocks.replace).toHaveBeenCalledWith("/admin/loja/affiliates")
  })

  it("says the API's refusal of an act in words", () => {
    mocks.act.mockReturnValue(mutation(act, { error: new AffiliateError("AFFILIATE_INVITE_RECENTLY_SENT") }))
    renderScreen()

    expect(screen.getByText("O convite acabou de sair. Espere um minuto para reenviar.")).toBeInTheDocument()
  })
})
