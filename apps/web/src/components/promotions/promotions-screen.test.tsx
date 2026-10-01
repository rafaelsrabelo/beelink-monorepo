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
  products: vi.fn(),
  save: vi.fn(),
  saveState: { isPending: false, error: null as Error | null, reset: vi.fn() },
  toggle: vi.fn(),
  toggleState: { isPending: false, variables: undefined as { id: string } | undefined, error: null as Error | null },
}))

const router = { push: mocks.push, replace: mocks.replace }
vi.mock("next/navigation", () => ({ useRouter: () => router, useSearchParams: () => mocks.search }))
vi.mock("@/services/addresses/use-debounced-value", () => ({ useDebouncedValue: (value: string) => value }))
vi.mock("@/services/catalog/catalog-hooks", () => ({
  useProducts: mocks.products,
  useProductCategories: () => ({
    data: [
      { id: "k1", slug: "proteinas", name: "Proteínas", parentSlug: null },
      { id: "k2", slug: "whey", name: "Whey", parentSlug: "proteinas" },
    ],
    isError: false,
    refetch: vi.fn(),
  }),
}))
vi.mock("@/services/promotions/promotion-hooks", () => ({
  usePromotions: mocks.promotions,
  useSavePromotion: () => ({ mutate: mocks.save, ...mocks.saveState }),
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
  mocks.products.mockReturnValue({ data: { products: [{ id: "w1", name: "Whey 900g" }, { id: "w2", name: "Creatina 300g" }] }, isFetching: false })
  mocks.save.mockReset()
  mocks.toggle.mockReset()
  mocks.push.mockReset()
  mocks.replace.mockReset()
  mocks.saveState.reset.mockReset()
  Object.assign(mocks.saveState, { isPending: false, error: null })
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

  it("creates a promotion: says the fields to correct first, then sends the body", async () => {
    view()
    await userEvent.click(screen.getByRole("button", { name: "Nova promoção" }))
    const form = screen.getByRole("region", { name: "Nova promoção" })

    await userEvent.click(within(form).getByRole("button", { name: "Salvar" }))
    expect(mocks.save).not.toHaveBeenCalled()
    expect(within(form).getByText("Preencha este campo.")).toBeInTheDocument()
    expect(within(form).getByText("Informe um percentual entre 0,01 e 100.")).toBeInTheDocument()

    await userEvent.type(within(form).getByLabelText("Nome"), "Dia das Mães")
    // Typing clears what was said of the last attempt.
    expect(within(form).queryByText("Preencha este campo.")).not.toBeInTheDocument()
    await userEvent.type(within(form).getByLabelText("Percentual (%)"), "15")
    await userEvent.click(within(form).getByRole("button", { name: "Salvar" }))

    expect(mocks.save).toHaveBeenCalledOnce()
    expect(mocks.save.mock.calls[0]?.[0]).toMatchObject({ id: null, payload: { name: "Dia das Mães", scope: "CART", discountKind: "PERCENT", percentBps: 1500, amountCents: null, endsAt: null, productIds: [], categoryIds: [] } })
    expect(mocks.save.mock.calls[0]?.[0].payload).not.toHaveProperty("active")
  })

  /** BEELINK-245. */
  it("says who a promotion is for: marked on its row, chosen in the form and sent with it", async () => {
    view()
    // One row is marked: the promotion for everyone says nothing.
    expect(within(screen.getByText("Queima").closest("li")!).getByText("Primeira compra")).toBeInTheDocument()
    expect(screen.getAllByText("Primeira compra")).toHaveLength(1)

    await userEvent.click(screen.getByRole("button", { name: "Nova promoção" }))
    const form = screen.getByRole("region", { name: "Nova promoção" })
    const audience = within(form).getByRole("group", { name: "Para quem vale" })
    expect(within(audience).getByRole("button", { name: "Todos os clientes" })).toHaveAttribute("aria-pressed", "true")

    await userEvent.type(within(form).getByLabelText("Nome"), "Boas-vindas")
    await userEvent.type(within(form).getByLabelText("Percentual (%)"), "15")
    await userEvent.click(within(audience).getByRole("button", { name: "Só na primeira compra" }))
    await userEvent.click(within(form).getByRole("button", { name: "Salvar" }))

    expect(mocks.save.mock.calls[0]?.[0]).toMatchObject({ id: null, payload: { name: "Boas-vindas", percentBps: 1500, audience: "FIRST_PURCHASE" } })
  })

  it("opens a promotion on the audience it was saved with", async () => {
    view()
    await userEvent.click(screen.getByRole("button", { name: "Editar a promoção Queima" }))
    const audience = within(screen.getByRole("region", { name: "Editar promoção" })).getByRole("group", { name: "Para quem vale" })

    expect(within(audience).getByRole("button", { name: "Só na primeira compra" })).toHaveAttribute("aria-pressed", "true")
  })

  it("puts the focus on the form it opens, which may be a screen away from the row", async () => {
    view()
    await userEvent.click(screen.getByRole("button", { name: "Editar a promoção Queima" }))
    expect(within(screen.getByRole("region", { name: "Editar promoção" })).getByLabelText("Nome")).toHaveFocus()
  })

  it("shows a new promotion saved under a status: the unfiltered list, where it is the first row", async () => {
    mocks.search = new URLSearchParams("situacao=pausadas")
    mocks.save.mockImplementation((_variables: unknown, options: { onSuccess: () => void }) => options.onSuccess())
    view()
    await userEvent.click(screen.getByRole("button", { name: "Nova promoção" }))
    const form = screen.getByRole("region", { name: "Nova promoção" })
    await userEvent.type(within(form).getByLabelText("Nome"), "Dia das Mães")
    await userEvent.type(within(form).getByLabelText("Percentual (%)"), "15")
    await userEvent.click(within(form).getByRole("button", { name: "Salvar" }))

    expect(mocks.push).toHaveBeenCalledWith("/admin/loja/promotions")
    expect(screen.queryByRole("region", { name: "Nova promoção" })).not.toBeInTheDocument()
  })

  it("holds the list while a save is on its way, and takes back the API's refusal once a field is corrected", async () => {
    mocks.saveState.error = Object.assign(new Error("x"), { errorCode: "PROMOTION_TARGET_NOT_FOUND" })
    const { rerender } = view()
    await userEvent.click(screen.getByRole("button", { name: "Editar a promoção Queima" }))
    mocks.saveState.reset.mockReset()
    await userEvent.type(screen.getByLabelText("Nome"), "!")
    expect(mocks.saveState.reset).toHaveBeenCalled()

    mocks.saveState.isPending = true
    rerender(<PromotionsScreen slug="loja" locale="pt-BR" messages={ui} web={web} />)
    expect(screen.getByRole("button", { name: "Editar a promoção Semana do Consumidor" })).toBeDisabled()
  })

  it("steps back to the last page with rows when the one asked for is past the end", () => {
    mocks.search = new URLSearchParams("situacao=ativas&pagina=3")
    mocks.promotions.mockReturnValue({ data: { ...page, promotions: [], total: 21, page: 3, pageSize: 20 }, isPending: false, isFetching: false, refetch: vi.fn() })
    view()
    expect(mocks.replace).toHaveBeenCalledWith("/admin/loja/promotions?situacao=ativas&pagina=2")
  })

  it("edits one with what it names, searching the catalogue only while products are being chosen", async () => {
    view()
    // Closed, the form asks the catalogue nothing.
    expect(mocks.products).toHaveBeenLastCalledWith("", expect.anything())

    await userEvent.click(screen.getByRole("button", { name: "Editar a promoção Queima" }))
    const form = screen.getByRole("region", { name: "Editar promoção" })
    expect(within(form).getByLabelText("Nome")).toHaveValue("Queima")
    expect(within(form).getByLabelText("Valor (R$)")).toHaveValue("5,00")
    expect(mocks.products).toHaveBeenLastCalledWith("loja", { pageSize: 20 })

    await userEvent.click(within(form).getByRole("button", { name: "Escolher Creatina 300g" }))
    await userEvent.click(within(form).getByRole("button", { name: "Salvar" }))
    expect(mocks.save.mock.calls[0]?.[0]).toMatchObject({ id: "p2", payload: { scope: "PRODUCTS", discountKind: "FIXED", amountCents: 500, productIds: ["w1", "w2"] } })

    await userEvent.click(within(form).getByRole("button", { name: "Em categorias escolhidas" }))
    expect(within(form).getByRole("checkbox", { name: "Whey" })).toBeInTheDocument()
    await userEvent.click(within(form).getByRole("button", { name: "Cancelar" }))
    expect(screen.queryByRole("region", { name: "Editar promoção" })).not.toBeInTheDocument()
  })

  it("says the API's refusal of a save as a sentence, and of a pause above the list", async () => {
    mocks.saveState.error = Object.assign(new Error("x"), { errorCode: "PROMOTION_TARGET_NOT_FOUND" })
    mocks.toggleState.error = Object.assign(new Error("x"), { errorCode: "PROMOTION_NOT_FOUND" })
    view()

    expect(screen.getByText("Essa promoção não está mais aqui.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Nova promoção" }))
    expect(screen.getByText(/não é mais desta loja/)).toBeInTheDocument()
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
