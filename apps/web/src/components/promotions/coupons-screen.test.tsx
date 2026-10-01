// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { CouponPage, CouponRedemptionPage } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { ptBR as web } from "@/locales/pt-BR"
import { CouponsScreen } from "./coupons-screen"

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  search: new URLSearchParams(),
  coupons: vi.fn(),
  redemptions: vi.fn(),
  save: vi.fn(),
  saveState: { isPending: false, error: null as Error | null, reset: vi.fn() },
  toggle: vi.fn(),
  toggleState: { isPending: false, variables: undefined as { id: string } | undefined, error: null as Error | null },
}))

const router = { push: mocks.push, replace: mocks.replace }
vi.mock("next/navigation", () => ({ useRouter: () => router, useSearchParams: () => mocks.search }))
vi.mock("@/services/promotions/promotion-hooks", () => ({
  useCoupons: mocks.coupons,
  useCouponRedemptions: mocks.redemptions,
  useSaveCoupon: () => ({ mutate: mocks.save, ...mocks.saveState }),
  useSetCouponActive: () => ({ mutate: mocks.toggle, ...mocks.toggleState }),
}))

const stamp = "2026-10-01T12:00:00.000Z"
const page: CouponPage = {
  coupons: [
    { id: "c1", code: "BEMVINDO10", kind: "PERCENT", percentBps: 1000, amountCents: null, minSubtotalCents: 5000, startsAt: stamp, endsAt: null, maxUses: 100, maxUsesPerCustomer: 1, usedCount: 3, active: true, status: "ACTIVE", audience: "FIRST_PURCHASE", createdAt: stamp, updatedAt: stamp },
    { id: "c2", code: "FRETE", kind: "FREE_SHIPPING", percentBps: null, amountCents: null, minSubtotalCents: 0, startsAt: stamp, endsAt: null, maxUses: null, maxUsesPerCustomer: null, usedCount: 0, active: false, status: "PAUSED", audience: "EVERYONE", createdAt: stamp, updatedAt: stamp },
  ],
  total: 2,
  page: 1,
  pageSize: 20,
  counts: { ALL: 2, ACTIVE: 1, SCHEDULED: 0, PAUSED: 1, ENDED: 0, EXHAUSTED: 0 },
}

const uses: CouponRedemptionPage = {
  redemptions: [
    { id: "u1", order: { number: 12, status: "ACCEPTED", totalCents: 17091, placedAt: stamp }, customer: { id: "k1", name: "Bia Souza" }, discountCents: 1899, redeemedAt: stamp },
    { id: "u2", order: { number: 9, status: "CANCELLED", totalCents: 5000, placedAt: stamp }, customer: { id: "k2", name: "Caio" }, discountCents: 500, redeemedAt: stamp },
  ],
  total: 2,
  page: 1,
  pageSize: 20,
}

beforeEach(() => {
  mocks.search = new URLSearchParams()
  mocks.coupons.mockReturnValue({ data: page, isPending: false, isFetching: false, refetch: vi.fn() })
  mocks.redemptions.mockReturnValue({ data: uses, isPending: false, isFetching: false, refetch: vi.fn() })
  mocks.save.mockReset()
  mocks.toggle.mockReset()
  Object.assign(mocks.saveState, { isPending: false, error: null })
  Object.assign(mocks.toggleState, { isPending: false, variables: undefined, error: null })
})

const view = () => render(<CouponsScreen slug="loja" locale="pt-BR" messages={ui} web={web} />)

describe("CouponsScreen", () => {
  it("lists the coupons with every status' count — exhausted among them — each status an address", () => {
    view()

    expect(mocks.coupons).toHaveBeenCalledWith("loja", {})
    expect(screen.getByRole("link", { name: "Todos (2)" })).toHaveAttribute("aria-current", "true")
    expect(screen.getByRole("link", { name: "Esgotados (0)" })).toHaveAttribute("href", "/admin/loja/coupons?situacao=esgotados")
    expect(screen.getByText("BEMVINDO10")).toBeInTheDocument()
    expect(screen.getByText(/Usos: 3 de 100$/)).toBeInTheDocument()
    expect(screen.getByText("Frete grátis")).toBeInTheDocument()
  })

  it("asks the API for the status in the address, and pauses or resumes from the list", async () => {
    mocks.search = new URLSearchParams("situacao=esgotados")
    view()
    expect(mocks.coupons).toHaveBeenCalledWith("loja", { status: "EXHAUSTED" })

    await userEvent.click(screen.getByRole("button", { name: "Pausar o cupom BEMVINDO10" }))
    expect(mocks.toggle).toHaveBeenCalledWith({ id: "c1", active: false })
    await userEvent.click(screen.getByRole("button", { name: "Religar o cupom FRETE" }))
    expect(mocks.toggle).toHaveBeenCalledWith({ id: "c2", active: true })
  })

  it("creates a coupon: says the fields to correct first, then sends the body", async () => {
    view()
    await userEvent.click(screen.getByRole("button", { name: "Novo cupom" }))
    const form = screen.getByRole("region", { name: "Novo cupom" })

    await userEvent.type(within(form).getByLabelText("Código"), "bem vindo")
    await userEvent.click(within(form).getByRole("button", { name: "Salvar" }))
    expect(mocks.save).not.toHaveBeenCalled()
    expect(within(form).getByText(/^Use de 3 a 30 letras/)).toBeInTheDocument()

    await userEvent.clear(within(form).getByLabelText("Código"))
    await userEvent.type(within(form).getByLabelText("Código"), "voltei15")
    await userEvent.type(within(form).getByLabelText("Percentual (%)"), "15")
    await userEvent.type(within(form).getByLabelText("Limite por cliente"), "1")
    await userEvent.click(within(form).getByRole("button", { name: "Salvar" }))

    expect(mocks.save.mock.calls[0]?.[0]).toMatchObject({ id: null, payload: { code: "voltei15", kind: "PERCENT", percentBps: 1500, minSubtotalCents: 0, maxUses: null, maxUsesPerCustomer: 1 } })
    expect(mocks.save.mock.calls[0]?.[0].payload).not.toHaveProperty("active")
  })

  /** BEELINK-245. */
  it("says who a coupon is for: marked on its row, chosen in the form and sent with it", async () => {
    view()
    // One row is marked: the coupon for everyone says nothing.
    expect(within(screen.getByText("BEMVINDO10").closest("li")!).getByText("Primeira compra")).toBeInTheDocument()
    expect(screen.getAllByText("Primeira compra")).toHaveLength(1)

    await userEvent.click(screen.getByRole("button", { name: "Novo cupom" }))
    const form = screen.getByRole("region", { name: "Novo cupom" })
    const audience = within(form).getByRole("group", { name: "Para quem vale" })
    expect(within(audience).getByRole("button", { name: "Todos os clientes" })).toHaveAttribute("aria-pressed", "true")

    await userEvent.type(within(form).getByLabelText("Código"), "primeira10")
    await userEvent.type(within(form).getByLabelText("Percentual (%)"), "10")
    await userEvent.click(within(audience).getByRole("button", { name: "Só na primeira compra" }))
    await userEvent.click(within(form).getByRole("button", { name: "Salvar" }))

    expect(mocks.save.mock.calls[0]?.[0]).toMatchObject({ id: null, payload: { code: "primeira10", percentBps: 1000, audience: "FIRST_PURCHASE" } })
  })

  it("opens a coupon on the audience it was saved with", async () => {
    view()
    await userEvent.click(screen.getByRole("button", { name: "Editar o cupom BEMVINDO10" }))
    const audience = within(screen.getByRole("region", { name: "Editar cupom" })).getByRole("group", { name: "Para quem vale" })

    expect(within(audience).getByRole("button", { name: "Só na primeira compra" })).toHaveAttribute("aria-pressed", "true")
  })

  it("edits one with what it holds, and says the API's refusal as a sentence", async () => {
    mocks.saveState.error = Object.assign(new Error("x"), { errorCode: "COUPON_CODE_TAKEN" })
    view()
    await userEvent.click(screen.getByRole("button", { name: "Editar o cupom BEMVINDO10" }))
    const form = screen.getByRole("region", { name: "Editar cupom" })

    expect(within(form).getByLabelText("Código")).toHaveValue("BEMVINDO10")
    expect(within(form).getByLabelText("Pedido mínimo (R$)")).toHaveValue("50,00")
    expect(within(form).getByLabelText("Limite de usos")).toHaveValue("100")
    expect(within(form).getByText("Outro cupom da loja já tem esse código.")).toBeInTheDocument()

    await userEvent.click(within(form).getByRole("button", { name: "Salvar" }))
    expect(mocks.save.mock.calls[0]?.[0]).toMatchObject({ id: "c1", payload: { code: "BEMVINDO10", minSubtotalCents: 5000, maxUses: 100 } })
  })

  it("opens a coupon's uses where the form would be: each order a link, a cancelled one marked", async () => {
    view()
    // Closed, nothing is asked.
    expect(mocks.redemptions).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("button", { name: "Ver os usos do cupom BEMVINDO10" }))
    const panel = screen.getByRole("region", { name: "Usos do cupom BEMVINDO10" })
    expect(mocks.redemptions).toHaveBeenLastCalledWith("loja", "c1", {})
    expect(within(panel).getByRole("link", { name: "Pedido #12" })).toHaveAttribute("href", "/admin/loja/orders/12")
    expect(within(panel).getByText("Cancelado")).toBeInTheDocument()
    // The panel opened above the list: the focus is in it, on its first control.
    expect(within(panel).getByRole("button", { name: "Fechar" })).toHaveFocus()

    // Opening the form takes the uses' place, and closing them leaves the list alone.
    await userEvent.click(screen.getByRole("button", { name: "Editar o cupom FRETE" }))
    expect(screen.queryByRole("region", { name: "Usos do cupom BEMVINDO10" })).not.toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Editar cupom" })).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Ver os usos do cupom FRETE" }))
    await userEvent.click(within(screen.getByRole("region", { name: "Usos do cupom FRETE" })).getByRole("button", { name: "Fechar" }))
    expect(screen.queryByRole("region", { name: /Usos do cupom/ })).not.toBeInTheDocument()
  })

  it("says a failed read failed, and an empty shop has none", () => {
    const refetch = vi.fn()
    mocks.coupons.mockReturnValue({ data: undefined, isPending: false, isFetching: false, refetch })
    const failed = view()
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar a lista.")
    failed.unmount()

    mocks.coupons.mockReturnValue({ data: { ...page, coupons: [], total: 0 }, isPending: false, isFetching: false, refetch })
    view()
    expect(screen.getByText("Nenhum cupom ainda.")).toBeInTheDocument()
  })
})
