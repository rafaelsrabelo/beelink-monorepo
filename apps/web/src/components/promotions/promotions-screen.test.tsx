// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { PromotionPage } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { ptBR as web } from "@/locales/pt-BR"
import { PromotionsScreen } from "./promotions-screen"

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  search: new URLSearchParams(),
  promotions: vi.fn(),
  toggle: vi.fn(),
  toggleState: { isPending: false, variables: undefined as { id: string } | undefined, error: null as Error | null },
}))

const router = { push: mocks.push, replace: mocks.replace }
vi.mock("next/navigation", () => ({ useRouter: () => router, useSearchParams: () => mocks.search }))
vi.mock("@/services/promotions/promotion-hooks", () => ({
  usePromotions: mocks.promotions,
  useSetPromotionActive: () => ({ mutate: mocks.toggle, ...mocks.toggleState }),
}))

const page: PromotionPage = {
  promotions: [
    { id: "p1", name: "Semana do Consumidor", scope: "CART", discountKind: "PERCENT", percentBps: 1000, amountCents: null, startsAt: "2026-10-01T12:00:00.000Z", endsAt: null, active: true, status: "ACTIVE", audience: "EVERYONE", products: [], categories: [], createdAt: "2026-10-01T12:00:00.000Z", updatedAt: "2026-10-01T12:00:00.000Z" },
    { id: "p2", name: "Queima", scope: "PRODUCTS", discountKind: "FIXED", percentBps: null, amountCents: 500, startsAt: "2026-09-01T12:00:00.000Z", endsAt: null, active: false, status: "PAUSED", audience: "FIRST_PURCHASE", products: [{ id: "w1", name: "Whey 900g", slug: "whey-900g" }], categories: [], createdAt: "2026-09-01T12:00:00.000Z", updatedAt: "2026-09-01T12:00:00.000Z" },
  ],
  total: 2,
  page: 1,
  pageSize: 20,
  counts: { ALL: 2, ACTIVE: 1, SCHEDULED: 0, PAUSED: 1, ENDED: 0 },
}

beforeEach(() => {
  mocks.search = new URLSearchParams()
  mocks.promotions.mockReturnValue({ data: page, isPending: false, isFetching: false, refetch: vi.fn() })
  mocks.toggle.mockReset()
  mocks.push.mockReset()
  mocks.replace.mockReset()
  Object.assign(mocks.toggleState, { isPending: false, variables: undefined, error: null })
})

const view = () => render(<PromotionsScreen slug="loja" locale="pt-BR" messages={ui} web={web} />)

describe("PromotionsScreen", () => {
  it("lists the promotions with every status' count, each status an address", () => {
    view()

    expect(mocks.promotions).toHaveBeenCalledWith("loja", {})
    expect(screen.getByRole("link", { name: "Todas (2)" })).toHaveAttribute("aria-current", "true")
    expect(screen.getByRole("link", { name: "Pausadas (1)" })).toHaveAttribute("href", "/admin/loja/promotions?situacao=pausadas")
    expect(screen.getByText("10% no carrinho inteiro")).toBeInTheDocument()
    expect(screen.getByText(/5,00 por unidade em 1 produto$/)).toBeInTheDocument()
  })

  it("asks the API for the status and the page in the address", () => {
    mocks.search = new URLSearchParams("situacao=pausadas&pagina=2")
    view()
    expect(mocks.promotions).toHaveBeenCalledWith("loja", { status: "PAUSED", page: 2 })
    expect(screen.getByRole("link", { name: "Pausadas (1)" })).toHaveAttribute("aria-current", "true")
  })

  it("pauses one and switches another back on, from the list", async () => {
    view()
    await userEvent.click(screen.getByRole("button", { name: "Pausar a promoção Semana do Consumidor" }))
    expect(mocks.toggle).toHaveBeenCalledWith({ id: "p1", active: false })
    await userEvent.click(screen.getByRole("button", { name: "Religar a promoção Queima" }))
    expect(mocks.toggle).toHaveBeenCalledWith({ id: "p2", active: true })
  })

  // BEELINK-306: the pop-up announces one of these, and is configured on a page of its own.
  it("leads to the first-purchase pop-up's own page in one click", () => {
    view()

    expect(screen.getByRole("link", { name: "Pop-up de primeira compra" })).toHaveAttribute("href", "/admin/loja/coupons/popup")
  })

  it("makes and changes a promotion on pages of their own, never in a form above the list", async () => {
    mocks.search = new URLSearchParams("situacao=pausadas&pagina=2")
    view()

    // A new one is the unfiltered list's first row: its page carries no status to go back to.
    expect(screen.getByRole("link", { name: "Nova promoção" })).toHaveAttribute("href", "/admin/loja/promotions/new")
    await userEvent.click(screen.getByRole("button", { name: "Editar a promoção Queima" }))
    expect(mocks.push).toHaveBeenCalledWith("/admin/loja/promotions/p2?situacao=pausadas&pagina=2")
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
  })

  /** BEELINK-245. */
  it("marks a promotion that is only for a first purchase on its row", () => {
    view()
    // One row is marked: the promotion for everyone says nothing.
    expect(within(screen.getByText("Queima").closest("li")!).getByText("Primeira compra")).toBeInTheDocument()
    expect(screen.getAllByText("Primeira compra")).toHaveLength(1)
  })

  it("holds the list while a pause is on its way, and says the API's refusal of one above the list", () => {
    mocks.toggleState.isPending = true
    mocks.toggleState.variables = { id: "p1" }
    mocks.toggleState.error = Object.assign(new Error("x"), { errorCode: "PROMOTION_NOT_FOUND" })
    view()

    expect(screen.getByRole("button", { name: "Editar a promoção Queima" })).toBeDisabled()
    expect(screen.getByText("Essa promoção não está mais aqui.")).toBeInTheDocument()
  })

  it("steps back to the last page with rows when the one asked for is past the end", () => {
    mocks.search = new URLSearchParams("situacao=ativas&pagina=3")
    mocks.promotions.mockReturnValue({ data: { ...page, promotions: [], total: 21, page: 3, pageSize: 20 }, isPending: false, isFetching: false, refetch: vi.fn() })
    view()
    expect(mocks.replace).toHaveBeenCalledWith("/admin/loja/promotions?situacao=ativas&pagina=2")
  })

  it("is grey shapes while it loads, says a failed read failed, and says an empty shop has none", () => {
    mocks.promotions.mockReturnValue({ data: undefined, isPending: true, isFetching: true, refetch: vi.fn() })
    const loading = view()
    expect(screen.queryByText("Nenhuma promoção ainda.")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Todas" })).toBeInTheDocument()
    loading.unmount()

    const refetch = vi.fn()
    mocks.promotions.mockReturnValue({ data: undefined, isPending: false, isFetching: false, refetch })
    const failed = view()
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar a lista.")
    failed.unmount()

    mocks.promotions.mockReturnValue({ data: { ...page, promotions: [], total: 0, counts: { ALL: 0, ACTIVE: 0, SCHEDULED: 0, PAUSED: 0, ENDED: 0 } }, isPending: false, isFetching: false, refetch })
    view()
    expect(screen.getByText("Nenhuma promoção ainda.")).toBeInTheDocument()
  })
})
