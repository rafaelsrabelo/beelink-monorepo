// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { AffiliateProgramOverview, ShopAffiliatePage } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { AffiliateError } from "@/services/affiliates/affiliate-requests"
import { AffiliatesListScreen } from "./affiliates-list-screen"

const mocks = vi.hoisted(() => ({ overview: vi.fn(), list: vi.fn(), invite: vi.fn(), replace: vi.fn(), params: { current: new URLSearchParams() } }))
vi.mock("@/services/affiliates/affiliate-hooks", () => ({ useAffiliateProgram: mocks.overview }))
vi.mock("@/services/affiliates/shop-affiliate-hooks", () => ({ useShopAffiliates: mocks.list, useInviteAffiliate: mocks.invite }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }), useSearchParams: () => mocks.params.current }))

const overview: AffiliateProgramOverview = {
  program: { enabled: true, attributionDays: 30, payoutDelayDays: 10, termsText: null, termsVersion: 0, updatedAt: "2026-11-11T12:00:00.000Z" },
  tables: [
    { id: "t1", name: "Padrão", defaultRateBps: 1000, isDefault: true, productRateCount: 0, categoryRateCount: 0, affiliateCount: 1, affiliate: null },
    { id: "t2", name: "Influencers", defaultRateBps: 1500, isDefault: false, productRateCount: 0, categoryRateCount: 0, affiliateCount: 0, affiliate: null },
  ],
  periods: [],
  linksLive: true,
}
const page: ShopAffiliatePage = {
  affiliates: [{ id: "a1", name: "Maria Souza", email: "maria@exemplo.com", phone: null, slug: null, status: "INVITED", table: { id: "t1", name: "Padrão", personal: false }, invitedAt: "2026-11-11T13:00:00.000Z", acceptedAt: null }],
  total: 1,
  page: 1,
  pageSize: 20,
}
const invite = vi.fn()

beforeEach(() => {
  invite.mockReset()
  mocks.replace.mockReset()
  mocks.params.current = new URLSearchParams()
  mocks.overview.mockReturnValue({ isPending: false, isError: false, data: overview })
  mocks.list.mockReturnValue({ isPending: false, isError: false, isFetching: false, data: page })
  mocks.invite.mockReturnValue({ mutate: invite, reset: vi.fn(), isPending: false, error: null })
})

describe("AffiliatesListScreen (IMPULSEIA-104)", () => {
  it("lists the shop's affiliates, each leading to their record", () => {
    render(<AffiliatesListScreen slug="loja" locale="pt-BR" messages={ui} />)

    expect(screen.getByRole("link", { name: "Maria Souza" })).toHaveAttribute("href", "/admin/loja/affiliates/a1")
    expect(screen.getByText("Convidado em 11/11/2026")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Afiliados" })).toHaveAttribute("aria-current", "page")
    expect(mocks.list).toHaveBeenCalledWith("loja", { status: null, page: 1 })
  })

  it("reads the standing and the page from the address, and writes them back starting at page one", async () => {
    mocks.params.current = new URLSearchParams("status=ACTIVE&page=3")
    render(<AffiliatesListScreen slug="loja" locale="pt-BR" messages={ui} />)

    expect(mocks.list).toHaveBeenCalledWith("loja", { status: "ACTIVE", page: 3 })
    await userEvent.click(screen.getByRole("tab", { name: "Pausados" }))
    expect(mocks.replace).toHaveBeenLastCalledWith("/admin/loja/affiliates?status=PAUSED")
    await userEvent.click(screen.getByRole("tab", { name: "Todos" }))
    expect(mocks.replace).toHaveBeenLastCalledWith("/admin/loja/affiliates")
  })

  it("invites on the default table unless another is chosen, and says where the invite went", async () => {
    invite.mockImplementation((_payload, options: { onSuccess: () => void }) => options.onSuccess())
    render(<AffiliatesListScreen slug="loja" locale="pt-BR" messages={ui} />)

    await userEvent.click(screen.getByRole("button", { name: "Convidar afiliado" }))
    const dialog = within(screen.getByRole("dialog", { name: "Convidar afiliado" }))
    await userEvent.type(dialog.getByLabelText("Nome"), "João Silva")
    await userEvent.type(dialog.getByLabelText("E-mail"), "Joao@Exemplo.com")
    await userEvent.type(dialog.getByLabelText("Telefone"), "(85) 99999-4321")
    await userEvent.type(dialog.getByLabelText("CPF"), "52998224725")
    expect(dialog.getByLabelText("CPF")).toHaveValue("529.982.247-25")
    await userEvent.click(dialog.getByRole("button", { name: "Enviar convite" }))

    expect(invite).toHaveBeenCalledWith({ name: "João Silva", email: "joao@exemplo.com", tableId: "t1", phone: "(85) 99999-4321", cpf: "52998224725", note: null }, expect.anything())
    expect(screen.getByRole("status")).toHaveTextContent("Convite enviado para joao@exemplo.com.")
  })

  it("says what to correct before asking, and the API's refusal in words", async () => {
    mocks.invite.mockReturnValue({ mutate: invite, reset: vi.fn(), isPending: false, error: new AffiliateError("AFFILIATE_EMAIL_TAKEN") })
    render(<AffiliatesListScreen slug="loja" locale="pt-BR" messages={ui} />)

    await userEvent.click(screen.getByRole("button", { name: "Convidar afiliado" }))
    const dialog = within(screen.getByRole("dialog", { name: "Convidar afiliado" }))
    await userEvent.click(dialog.getByRole("button", { name: "Enviar convite" }))
    expect(invite).not.toHaveBeenCalled()
    expect(dialog.getByText("Informe um e-mail válido.")).toBeInTheDocument()
    expect(dialog.getByText("Informe um telefone com DDD.")).toBeInTheDocument()
    expect(dialog.getByText("Informe um CPF válido.")).toBeInTheDocument()
    expect(dialog.getByText("Este e-mail já é de um afiliado da loja.")).toBeInTheDocument()
  })

  it("shows a skeleton while either read is on its way", () => {
    mocks.list.mockReturnValue({ isPending: true, isError: false })
    const { container } = render(<AffiliatesListScreen slug="loja" locale="pt-BR" messages={ui} />)

    expect(container.querySelector("[data-slot=skeleton]")).not.toBeNull()
  })
})
