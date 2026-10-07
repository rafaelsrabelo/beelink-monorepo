// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { Coupon } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { ptBR as web } from "@/locales/pt-BR"
import { CouponEditorScreen } from "./coupon-editor-screen"

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  search: new URLSearchParams(),
  coupon: vi.fn(),
  save: vi.fn(),
  saveState: { isPending: false, isSuccess: false, error: null as Error | null, reset: vi.fn() },
}))

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }), useSearchParams: () => mocks.search }))
vi.mock("@/services/promotions/promotion-hooks", () => ({
  useCoupon: mocks.coupon,
  useSaveCoupon: () => ({ mutate: mocks.save, ...mocks.saveState }),
}))

const stamp = "2026-10-01T12:00:00.000Z"
const bemVindo: Coupon = { id: "c1", code: "BEMVINDO10", kind: "PERCENT", percentBps: 1000, amountCents: null, minSubtotalCents: 5000, startsAt: stamp, endsAt: null, maxUses: 100, maxUsesPerCustomer: 1, usedCount: 3, active: true, status: "ACTIVE", audience: "FIRST_PURCHASE", shownInStore: true, createdAt: stamp, updatedAt: stamp }

beforeEach(() => {
  mocks.search = new URLSearchParams()
  mocks.coupon.mockReturnValue({ data: undefined, isPending: true, isError: false, error: null, refetch: vi.fn() })
  mocks.save.mockReset()
  mocks.push.mockReset()
  mocks.saveState.reset.mockReset()
  Object.assign(mocks.saveState, { isPending: false, isSuccess: false, error: null })
})

const view = (couponId?: string) => render(<CouponEditorScreen slug="loja" {...(couponId ? { couponId } : {})} messages={ui} web={web} />)
const editing = () => mocks.coupon.mockReturnValue({ data: bemVindo, isPending: false, isError: false, error: null, refetch: vi.fn() })

describe("CouponEditorScreen", () => {
  it("creates a coupon: says the fields to correct first, sends the body, and goes back to the list", async () => {
    mocks.save.mockImplementation((_variables: unknown, options: { onSuccess: () => void }) => options.onSuccess())
    view()
    expect(mocks.coupon).toHaveBeenCalledWith("loja", "")
    expect(screen.getByRole("heading", { level: 1, name: "Novo cupom" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Cupons" })).toHaveAttribute("href", "/admin/loja/coupons")

    await userEvent.type(screen.getByLabelText("Código"), "bem vindo")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(mocks.save).not.toHaveBeenCalled()
    expect(screen.getByText(/^Use de 3 a 30 letras/)).toBeInTheDocument()

    await userEvent.clear(screen.getByLabelText("Código"))
    await userEvent.type(screen.getByLabelText("Código"), "voltei15")
    await userEvent.type(screen.getByLabelText("Percentual (%)"), "15")
    await userEvent.type(screen.getByLabelText("Limite por cliente"), "1")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))

    expect(mocks.save.mock.calls[0]?.[0]).toMatchObject({ id: null, payload: { code: "voltei15", kind: "PERCENT", percentBps: 1500, minSubtotalCents: 0, maxUses: null, maxUsesPerCustomer: 1 } })
    expect(mocks.save.mock.calls[0]?.[0].payload).not.toHaveProperty("active")
    expect(mocks.push).toHaveBeenCalledWith("/admin/loja/coupons")
  })

  /** BEELINK-245. */
  it("chooses who a new coupon is for, and sends it", async () => {
    view()
    const audience = screen.getByRole("group", { name: "Para quem vale" })
    expect(within(audience).getByRole("button", { name: "Todos os clientes" })).toHaveAttribute("aria-pressed", "true")

    await userEvent.type(screen.getByLabelText("Código"), "primeira10")
    await userEvent.type(screen.getByLabelText("Percentual (%)"), "10")
    await userEvent.click(within(audience).getByRole("button", { name: "Só na primeira compra" }))
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))

    expect(mocks.save.mock.calls[0]?.[0]).toMatchObject({ id: null, payload: { code: "primeira10", percentBps: 1000, audience: "FIRST_PURCHASE" } })
  })

  describe("\"Mostrar este cupom na loja\"", () => {
    it("is off on a new coupon, says what it does, and is sent as chosen", async () => {
      view()
      const shown = screen.getByRole("switch", { name: "Mostrar este cupom na loja" })
      expect(shown).not.toBeChecked()
      expect(shown).toHaveAccessibleDescription("Clientes com conta veem o código na vitrine e no carrinho quando podem usá-lo. Desligado, só usa quem recebeu o código.")

      await userEvent.type(screen.getByLabelText("Código"), "bemvindo10")
      await userEvent.type(screen.getByLabelText("Percentual (%)"), "10")
      await userEvent.click(shown)
      await userEvent.click(screen.getByRole("button", { name: "Salvar" }))

      expect(mocks.save.mock.calls[0]?.[0]).toMatchObject({ id: null, payload: { code: "bemvindo10", shownInStore: true } })
    })

    // Sent as false, never left out: the API reads an absent switch as off, and the form says the same.
    it("travels as off when it was left alone", async () => {
      view()
      await userEvent.type(screen.getByLabelText("Código"), "privado10")
      await userEvent.type(screen.getByLabelText("Percentual (%)"), "10")
      await userEvent.click(screen.getByRole("button", { name: "Salvar" }))

      expect(mocks.save.mock.calls[0]?.[0].payload).toHaveProperty("shownInStore", false)
    })

    it("opens as the coupon holds it, and a save keeps it", async () => {
      editing()
      view("c1")
      expect(screen.getByRole("switch", { name: "Mostrar este cupom na loja" })).toBeChecked()

      await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
      expect(mocks.save.mock.calls[0]?.[0]).toMatchObject({ id: "c1", payload: { shownInStore: true } })
    })
  })

  it("edits one with what it holds, and says the API's refusal as a sentence", async () => {
    mocks.saveState.error = Object.assign(new Error("x"), { errorCode: "COUPON_CODE_TAKEN" })
    editing()
    view("c1")
    expect(mocks.coupon).toHaveBeenCalledWith("loja", "c1")
    expect(screen.getByRole("heading", { level: 1, name: "Editar cupom" })).toBeInTheDocument()
    expect(screen.getByLabelText("Código")).toHaveValue("BEMVINDO10")
    expect(screen.getByLabelText("Pedido mínimo (R$)")).toHaveValue("50,00")
    expect(screen.getByLabelText("Limite de usos")).toHaveValue("100")
    expect(within(screen.getByRole("group", { name: "Para quem vale" })).getByRole("button", { name: "Só na primeira compra" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByText("Outro cupom da loja já tem esse código.")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(mocks.save.mock.calls[0]?.[0]).toMatchObject({ id: "c1", payload: { code: "BEMVINDO10", minSubtotalCents: 5000, maxUses: 100 } })
  })

  it("goes back to the status and the page the list was left on, and takes the API's refusal back once a field is corrected", async () => {
    mocks.search = new URLSearchParams("situacao=ativos&pagina=3")
    mocks.saveState.error = Object.assign(new Error("x"), { errorCode: "COUPON_CODE_TAKEN" })
    editing()
    view("c1")
    expect(screen.getByRole("link", { name: "Cupons" })).toHaveAttribute("href", "/admin/loja/coupons?situacao=ativos&pagina=3")

    await userEvent.type(screen.getByLabelText("Código"), "X")
    expect(mocks.saveState.reset).toHaveBeenCalled()
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(mocks.push).toHaveBeenCalledWith("/admin/loja/coupons?situacao=ativos&pagina=3")
  })

  it("is grey shapes while the coupon is read, and says so when it is not there", async () => {
    const loading = view("c1")
    expect(screen.queryByLabelText("Código")).not.toBeInTheDocument()
    loading.unmount()

    const refetch = vi.fn()
    mocks.coupon.mockReturnValue({ data: undefined, isPending: false, isError: true, error: Object.assign(new Error("x"), { errorCode: "COUPON_NOT_FOUND" }), refetch })
    view("c1")
    expect(screen.getByRole("alert")).toHaveTextContent("Esse cupom não está mais aqui.")
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})
