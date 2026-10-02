// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { Promotion } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { ptBR as web } from "@/locales/pt-BR"
import { PromotionEditorScreen } from "./promotion-editor-screen"

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  search: new URLSearchParams(),
  promotion: vi.fn(),
  products: vi.fn(),
  save: vi.fn(),
  saveState: { isPending: false, isSuccess: false, error: null as Error | null, reset: vi.fn() },
}))

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }), useSearchParams: () => mocks.search }))
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
  usePromotion: mocks.promotion,
  useSavePromotion: () => ({ mutate: mocks.save, ...mocks.saveState }),
}))

const queima: Promotion = { id: "p2", name: "Queima", scope: "PRODUCTS", discountKind: "FIXED", percentBps: null, amountCents: 500, startsAt: "2026-09-01T12:00:00.000Z", endsAt: null, active: false, status: "PAUSED", audience: "FIRST_PURCHASE", products: [{ id: "w1", name: "Whey 900g", slug: "whey-900g" }], categories: [], createdAt: "2026-09-01T12:00:00.000Z", updatedAt: "2026-09-01T12:00:00.000Z" }

beforeEach(() => {
  mocks.search = new URLSearchParams()
  mocks.promotion.mockReturnValue({ data: undefined, isPending: true, isError: false, error: null, refetch: vi.fn() })
  mocks.products.mockReturnValue({ data: { products: [{ id: "w1", name: "Whey 900g" }, { id: "w2", name: "Creatina 300g" }] }, isFetching: false })
  mocks.save.mockReset()
  mocks.push.mockReset()
  mocks.saveState.reset.mockReset()
  Object.assign(mocks.saveState, { isPending: false, isSuccess: false, error: null })
})

const view = (promotionId?: string) => render(<PromotionEditorScreen slug="loja" {...(promotionId ? { promotionId } : {})} messages={ui} web={web} />)
const editing = () => mocks.promotion.mockReturnValue({ data: queima, isPending: false, isError: false, error: null, refetch: vi.fn() })

describe("PromotionEditorScreen", () => {
  it("creates a promotion: says the fields to correct first, sends the body, and goes back to the list", async () => {
    mocks.save.mockImplementation((_variables: unknown, options: { onSuccess: () => void }) => options.onSuccess())
    view()
    // A new one asks the API for nothing, and the catalogue neither while the cart is the target.
    expect(mocks.promotion).toHaveBeenCalledWith("loja", "")
    expect(mocks.products).toHaveBeenLastCalledWith("", expect.anything())
    expect(screen.getByRole("heading", { level: 1, name: "Nova promoção" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Promoções" })).toHaveAttribute("href", "/admin/loja/promotions")

    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(mocks.save).not.toHaveBeenCalled()
    expect(screen.getByText("Preencha este campo.")).toBeInTheDocument()
    expect(screen.getByText("Informe um percentual entre 0,01 e 100.")).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText("Nome"), "Dia das Mães")
    // Typing clears what was said of the last attempt.
    expect(screen.queryByText("Preencha este campo.")).not.toBeInTheDocument()
    await userEvent.type(screen.getByLabelText("Percentual (%)"), "15")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))

    expect(mocks.save).toHaveBeenCalledOnce()
    expect(mocks.save.mock.calls[0]?.[0]).toMatchObject({ id: null, payload: { name: "Dia das Mães", scope: "CART", discountKind: "PERCENT", percentBps: 1500, amountCents: null, endsAt: null, productIds: [], categoryIds: [] } })
    expect(mocks.save.mock.calls[0]?.[0].payload).not.toHaveProperty("active")
    expect(mocks.push).toHaveBeenCalledWith("/admin/loja/promotions")
  })

  /** BEELINK-245. */
  it("chooses who a new promotion is for, and sends it", async () => {
    view()
    const audience = screen.getByRole("group", { name: "Para quem vale" })
    expect(within(audience).getByRole("button", { name: "Todos os clientes" })).toHaveAttribute("aria-pressed", "true")

    await userEvent.type(screen.getByLabelText("Nome"), "Boas-vindas")
    await userEvent.type(screen.getByLabelText("Percentual (%)"), "15")
    await userEvent.click(within(audience).getByRole("button", { name: "Só na primeira compra" }))
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))

    expect(mocks.save.mock.calls[0]?.[0]).toMatchObject({ id: null, payload: { name: "Boas-vindas", percentBps: 1500, audience: "FIRST_PURCHASE" } })
  })

  it("edits one with what it names, searching the catalogue only while products are being chosen", async () => {
    editing()
    view("p2")
    expect(mocks.promotion).toHaveBeenCalledWith("loja", "p2")
    expect(screen.getByRole("heading", { level: 1, name: "Editar promoção" })).toBeInTheDocument()
    expect(screen.getByLabelText("Nome")).toHaveValue("Queima")
    expect(screen.getByLabelText("Valor (R$)")).toHaveValue("5,00")
    expect(within(screen.getByRole("group", { name: "Para quem vale" })).getByRole("button", { name: "Só na primeira compra" })).toHaveAttribute("aria-pressed", "true")
    expect(mocks.products).toHaveBeenLastCalledWith("loja", { pageSize: 20 })

    await userEvent.click(screen.getByRole("button", { name: "Escolher Creatina 300g" }))
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(mocks.save.mock.calls[0]?.[0]).toMatchObject({ id: "p2", payload: { scope: "PRODUCTS", discountKind: "FIXED", amountCents: 500, productIds: ["w1", "w2"] } })

    await userEvent.click(screen.getByRole("button", { name: "Em categorias escolhidas" }))
    expect(screen.getByRole("checkbox", { name: "Whey" })).toBeInTheDocument()
  })

  it("goes back to the status and the page the list was left on, saved or cancelled", async () => {
    mocks.search = new URLSearchParams("situacao=pausadas&pagina=2")
    mocks.save.mockImplementation((_variables: unknown, options: { onSuccess: () => void }) => options.onSuccess())
    editing()
    view("p2")
    const list = "/admin/loja/promotions?situacao=pausadas&pagina=2"
    expect(screen.getByRole("link", { name: "Promoções" })).toHaveAttribute("href", list)

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(mocks.push).toHaveBeenLastCalledWith(list)
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(mocks.push).toHaveBeenCalledTimes(2)
    expect(mocks.push).toHaveBeenLastCalledWith(list)
  })

  it("says the API's refusal as a sentence, takes it back once a field is corrected, and holds the form once saved", async () => {
    mocks.saveState.error = Object.assign(new Error("x"), { errorCode: "PROMOTION_TARGET_NOT_FOUND" })
    editing()
    const { rerender } = view("p2")
    expect(screen.getByText(/não é mais desta loja/)).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText("Nome"), "!")
    expect(mocks.saveState.reset).toHaveBeenCalled()

    // Saved, the list is on its way: a second click would save it twice.
    Object.assign(mocks.saveState, { error: null, isSuccess: true })
    rerender(<PromotionEditorScreen slug="loja" promotionId="p2" messages={ui} web={web} />)
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled()
  })

  it("is grey shapes while the promotion is read, and says so when it is not there", async () => {
    const loading = view("p2")
    expect(screen.queryByLabelText("Nome")).not.toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 1, name: "Editar promoção" })).toBeInTheDocument()
    loading.unmount()

    const refetch = vi.fn()
    mocks.promotion.mockReturnValue({ data: undefined, isPending: false, isError: true, error: Object.assign(new Error("x"), { errorCode: "PROMOTION_NOT_FOUND" }), refetch })
    view("p2")
    expect(screen.getByRole("alert")).toHaveTextContent("Essa promoção não está mais aqui.")
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})
