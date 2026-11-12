// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { ShopAffiliatePage } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { AffiliatesListScreen } from "./affiliates-list-screen"

const mocks = vi.hoisted(() => ({ list: vi.fn(), replace: vi.fn(), push: vi.fn(), params: { current: new URLSearchParams() } }))
vi.mock("@/services/affiliates/shop-affiliate-hooks", () => ({ useShopAffiliates: mocks.list }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace, push: mocks.push }), useSearchParams: () => mocks.params.current }))

const page: ShopAffiliatePage = {
  affiliates: [{ id: "a1", name: "Maria Souza", email: "maria@exemplo.com", phone: null, slug: null, status: "INVITED", table: { id: "t1", name: "Padrão", personal: false }, invitedAt: "2026-11-11T13:00:00.000Z", acceptedAt: null }],
  total: 1,
  page: 1,
  pageSize: 20,
}
beforeEach(() => {
  mocks.replace.mockReset()
  mocks.push.mockReset()
  mocks.params.current = new URLSearchParams()
  mocks.list.mockReturnValue({ isPending: false, isError: false, isFetching: false, data: page })
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

  it('leads "Convidar afiliado" to the step-by-step invite (12/11/2026)', async () => {
    render(<AffiliatesListScreen slug="loja" locale="pt-BR" messages={ui} />)

    await userEvent.click(screen.getByRole("button", { name: "Convidar afiliado" }))
    expect(mocks.push).toHaveBeenCalledWith("/admin/loja/affiliates/new")
  })

  it("shows a skeleton while either read is on its way", () => {
    mocks.list.mockReturnValue({ isPending: true, isError: false })
    const { container } = render(<AffiliatesListScreen slug="loja" locale="pt-BR" messages={ui} />)

    expect(container.querySelector("[data-slot=skeleton]")).not.toBeNull()
  })
})
