// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { CommissionTable, Product, ProductCategory } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { AffiliateError } from "@/services/affiliates/affiliate-requests"
import { CommissionTableScreen } from "./commission-table-screen"

const mocks = vi.hoisted(() => ({ table: vi.fn(), saveProduct: vi.fn(), saveCategory: vi.fn(), update: vi.fn(), products: vi.fn(), categories: vi.fn(), replace: vi.fn() }))
vi.mock("@/services/affiliates/affiliate-hooks", () => ({
  useCommissionTable: mocks.table,
  useSaveProductCommission: mocks.saveProduct,
  useSaveCategoryCommission: mocks.saveCategory,
  useUpdateCommissionTable: mocks.update,
}))
vi.mock("@/services/catalog/catalog-hooks", () => ({ useProducts: mocks.products, useProductCategories: mocks.categories }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }), useSearchParams: () => new URLSearchParams() }))

const table: CommissionTable = {
  id: "t1",
  name: "Padrão",
  defaultRateBps: 1000,
  isDefault: true,
  rates: [{ productId: "p1", rateBps: 2500 }],
  categoryRates: [{ categoryId: "c1", rateBps: 1500 }], affiliate: null,
  updatedAt: "2026-11-11T12:00:00.000Z",
}
const products = [
  { id: "p1", name: "Whey", images: [], category: { id: "c1", name: "Suplementos" } },
  { id: "p2", name: "Creatina", images: [], category: { id: "c1", name: "Suplementos" } },
  { id: "p3", name: "Camiseta", images: [], category: null },
] as unknown as Product[]
const categories = [
  { id: "c1", name: "Suplementos" },
  { id: "c2", name: "Roupas" },
] as unknown as ProductCategory[]
const saveProduct = vi.fn()
const saveCategory = vi.fn()
const update = vi.fn()

beforeEach(() => {
  saveProduct.mockReset().mockResolvedValue(undefined)
  saveCategory.mockReset().mockResolvedValue(undefined)
  update.mockReset()
  mocks.table.mockReturnValue({ isPending: false, isError: false, data: table })
  mocks.products.mockReturnValue({ isPending: false, isFetching: false, data: { products, total: 3, page: 1, pageSize: 20 } })
  mocks.categories.mockReturnValue({ isPending: false, data: categories })
  mocks.saveProduct.mockReturnValue({ mutateAsync: saveProduct })
  mocks.saveCategory.mockReturnValue({ mutateAsync: saveCategory })
  mocks.update.mockReturnValue({ mutate: update, isPending: false })
})

const screenOf = () => render(<CommissionTableScreen slug="loja" tableId="t1" locale="pt-BR" messages={ui} />)

describe("CommissionTableScreen (IMPULSEIA-102, and the user's review of 12/11)", () => {
  it("shows the general rate, the categories' and the products' — each following what is under it", () => {
    screenOf()

    expect(screen.getByRole("heading", { level: 2, name: "Padrão" })).toBeInTheDocument()
    expect(screen.getByLabelText("Comissão em todos os produtos (%)")).toHaveValue("10")
    expect(screen.getByLabelText("Suplementos")).toHaveValue("15")
    expect(screen.getByLabelText("Roupas")).toHaveAccessibleDescription("Segue o geral: 10%")
    expect(screen.getByLabelText("Whey")).toHaveValue("25")
    expect(screen.getByLabelText("Creatina")).toHaveAccessibleDescription("Segue a categoria Suplementos: 15%")
    expect(screen.getByLabelText("Camiseta")).toHaveAccessibleDescription("Segue o geral: 10%")
  })

  it("edits the Padrão's general rate in place, keeping its name, and refuses an empty one", async () => {
    update.mockImplementation((_variables, options: { onSuccess: () => void }) => options.onSuccess())
    screenOf()

    const general = screen.getByLabelText("Comissão em todos os produtos (%)")
    await userEvent.clear(general)
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(update).not.toHaveBeenCalled()
    expect(general).toHaveAccessibleDescription("Informe um percentual de 0% a 100%.")

    await userEvent.type(general, "12,5")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(update).toHaveBeenCalledWith({ tableId: "t1", payload: { name: "Padrão", defaultRateBps: 1250 } }, expect.anything())
    expect(screen.getByText("Percentual geral salvo: 12,5%.")).toBeInTheDocument()
  })

  it("saves a category's rate, and drops it back to the general one", async () => {
    screenOf()

    await userEvent.type(screen.getByLabelText("Roupas"), "8")
    await userEvent.click(screen.getByRole("button", { name: "Salvar comissão de Roupas" }))
    expect(saveCategory).toHaveBeenCalledWith({ tableId: "t1", categoryId: "c2", rateBps: 800 })
    expect(await screen.findByText("Comissão de Roupas salva.")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Usar o geral em Suplementos" }))
    expect(saveCategory).toHaveBeenLastCalledWith({ tableId: "t1", categoryId: "c1", rateBps: null })
  })

  it("saves a product's rate, 0 included, and drops it back — an emptied field does the same", async () => {
    screenOf()

    await userEvent.type(screen.getByLabelText("Creatina"), "0")
    await userEvent.click(screen.getByRole("button", { name: "Salvar comissão de Creatina" }))
    expect(saveProduct).toHaveBeenCalledWith({ tableId: "t1", productId: "p2", rateBps: 0 })
    expect(await screen.findByText("Comissão de Creatina salva.")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Usar o da categoria em Whey" }))
    expect(saveProduct).toHaveBeenLastCalledWith({ tableId: "t1", productId: "p1", rateBps: null })
  })

  it("refuses a rate out of range under its row, and says the API's refusal there too", async () => {
    saveProduct.mockRejectedValue(new AffiliateError("PRODUCT_NOT_FOUND"))
    screenOf()

    await userEvent.type(screen.getByLabelText("Creatina"), "101")
    await userEvent.click(screen.getByRole("button", { name: "Salvar comissão de Creatina" }))
    expect(screen.getByLabelText("Creatina")).toHaveAccessibleDescription("Informe um percentual de 0% a 100%.")
    expect(saveProduct).not.toHaveBeenCalled()

    await userEvent.clear(screen.getByLabelText("Creatina"))
    await userEvent.type(screen.getByLabelText("Creatina"), "5")
    await userEvent.click(screen.getByRole("button", { name: "Salvar comissão de Creatina" }))
    await vi.waitFor(() => expect(screen.getByLabelText("Creatina")).toHaveAccessibleDescription("Este produto não existe mais."))
  })
})
