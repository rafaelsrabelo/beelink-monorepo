// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { CommissionTable, Product } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { AffiliateError } from "@/services/affiliates/affiliate-requests"
import { CommissionTableScreen } from "./commission-table-screen"

const mocks = vi.hoisted(() => ({ table: vi.fn(), save: vi.fn(), products: vi.fn(), replace: vi.fn() }))
vi.mock("@/services/affiliates/affiliate-hooks", () => ({ useCommissionTable: mocks.table, useSaveProductCommission: mocks.save }))
vi.mock("@/services/catalog/catalog-hooks", () => ({ useProducts: mocks.products }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }), useSearchParams: () => new URLSearchParams() }))

const table: CommissionTable = { id: "t1", name: "Influencers", defaultRateBps: 1500, isDefault: false, rates: [{ productId: "p1", rateBps: 2500 }], updatedAt: "2026-11-11T12:00:00.000Z" }
const products = [
  { id: "p1", name: "Whey", images: [] },
  { id: "p2", name: "Creatina", images: [] },
] as unknown as Product[]
const mutate = vi.fn()

beforeEach(() => {
  mutate.mockReset()
  mocks.table.mockReturnValue({ isPending: false, isError: false, data: table })
  mocks.products.mockReturnValue({ isPending: false, isFetching: false, data: { products, total: 2, page: 1, pageSize: 20 } })
  mocks.save.mockReturnValue({ mutate, isPending: false, variables: undefined })
})

describe("CommissionTableScreen (IMPULSEIA-102)", () => {
  it("shows each product's own rate on the table, or the table's it follows", () => {
    render(<CommissionTableScreen slug="loja" tableId="t1" locale="pt-BR" messages={ui} />)

    expect(screen.getByRole("heading", { level: 2, name: "Influencers" })).toBeInTheDocument()
    expect(screen.getByText("15% em todos os produtos, menos nos que têm percentual próprio aqui.")).toBeInTheDocument()
    expect(screen.getByLabelText("Whey")).toHaveValue("25")
    expect(screen.getByLabelText("Creatina")).toHaveAccessibleDescription("Segue o geral: 15%")
  })

  it("saves a row's rate, 0 included, and says it was saved", async () => {
    mutate.mockImplementation((_variables, options: { onSuccess: () => void }) => options.onSuccess())
    render(<CommissionTableScreen slug="loja" tableId="t1" locale="pt-BR" messages={ui} />)

    await userEvent.type(screen.getByLabelText("Creatina"), "0")
    await userEvent.click(screen.getByRole("button", { name: "Salvar comissão de Creatina" }))
    expect(mutate).toHaveBeenCalledWith({ tableId: "t1", productId: "p2", rateBps: 0 }, expect.anything())
    expect(screen.getByText("Comissão de Creatina salva.")).toBeInTheDocument()
  })

  it("drops a product's own rate back to the table's, and an emptied field does the same", async () => {
    render(<CommissionTableScreen slug="loja" tableId="t1" locale="pt-BR" messages={ui} />)

    await userEvent.click(screen.getByRole("button", { name: "Usar o geral em Whey" }))
    expect(mutate).toHaveBeenLastCalledWith({ tableId: "t1", productId: "p1", rateBps: null }, expect.anything())

    await userEvent.clear(screen.getByLabelText("Whey"))
    await userEvent.click(screen.getByRole("button", { name: "Salvar comissão de Whey" }))
    expect(mutate).toHaveBeenLastCalledWith({ tableId: "t1", productId: "p1", rateBps: null }, expect.anything())
  })

  it("refuses a rate out of range under its row, and says the API's refusal there too", async () => {
    mutate.mockImplementation((_variables, options: { onError: (error: Error) => void }) => options.onError(new AffiliateError("PRODUCT_NOT_FOUND")))
    render(<CommissionTableScreen slug="loja" tableId="t1" locale="pt-BR" messages={ui} />)

    await userEvent.type(screen.getByLabelText("Creatina"), "101")
    await userEvent.click(screen.getByRole("button", { name: "Salvar comissão de Creatina" }))
    expect(screen.getByLabelText("Creatina")).toHaveAccessibleDescription("Informe um percentual de 0% a 100%.")
    expect(mutate).not.toHaveBeenCalled()

    await userEvent.clear(screen.getByLabelText("Creatina"))
    await userEvent.type(screen.getByLabelText("Creatina"), "5")
    await userEvent.click(screen.getByRole("button", { name: "Salvar comissão de Creatina" }))
    expect(screen.getByLabelText("Creatina")).toHaveAccessibleDescription("Este produto não existe mais.")
  })
})
