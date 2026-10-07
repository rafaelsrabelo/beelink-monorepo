// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { FirstPurchaseHeadline, StorePopupOverview } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { DiscountError } from "@/services/promotions/promotion-requests"
import { PopupScreen } from "./popup-screen"

const mocks = vi.hoisted(() => ({ popup: vi.fn(), save: vi.fn(), store: vi.fn(), upload: vi.fn() }))
vi.mock("@/services/promotions/popup-hooks", () => ({ usePopup: mocks.popup, useSavePopup: mocks.save }))
vi.mock("@/services/stores/store-hooks", () => ({ useStore: mocks.store }))
vi.mock("@/services/uploads/upload-hooks", () => ({ useImageUpload: () => ({ upload: mocks.upload, pending: false, error: null, reset: vi.fn() }) }))
vi.mock("@/components/storefront/shop-font", () => ({ figtree: { style: { fontFamily: "Figtree" } } }))
vi.mock("next/link", () => ({ default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a> }))

const five: FirstPurchaseHeadline = { source: "COUPON", kind: "PERCENT", percentBps: 500, amountCents: null, minSubtotalCents: 0, endsAt: null, wholeCart: true }
const fifteen: FirstPurchaseHeadline = { source: "PROMOTION", kind: "PERCENT", percentBps: 1500, amountCents: null, minSubtotalCents: 0, endsAt: null, wholeCart: true }
const settings: StorePopupOverview["settings"] = { enabled: false, imageUrl: null, title: null, text: null, buttonLabel: null, trigger: "ON_ARRIVAL", delaySeconds: 5, benefitSource: "AUTO", benefitId: null, keepReminder: false, revision: 1, updatedAt: null }
const overview: StorePopupOverview = {
  settings,
  benefit: fifteen,
  headline: fifteen,
  options: [
    { source: "PROMOTION", id: "p1", label: "Primeira compra", benefit: fifteen },
    { source: "COUPON", id: "c1", label: "PRIMEIRA5", benefit: five },
  ],
  customerOffer: { source: "COUPON", code: "PRIMEIRA5", kind: "PERCENT", percentBps: 500, amountCents: null, minSubtotalCents: 0, endsAt: null },
}
const colors = { background: "oklch(1 0 0)", primary: "oklch(0.5 0.2 260)", header: "oklch(1 0 0)", footer: "oklch(0.2 0 0)" }
const mutate = vi.fn()

function saving(state: { error?: Error | null; isSuccess?: boolean; isPending?: boolean } = {}) {
  mocks.save.mockReturnValue({ mutate, reset: vi.fn(), isPending: state.isPending ?? false, error: state.error ?? null, isSuccess: state.isSuccess ?? false })
}
const reading = (data: StorePopupOverview) => mocks.popup.mockReturnValue({ isPending: false, isError: false, data, refetch: vi.fn() })
const show = () => render(<PopupScreen slug="loja" locale="pt-BR" messages={ui} />)
const preview = () => screen.getByRole("region", { name: "Prévia" })

beforeEach(() => {
  mutate.mockReset()
  reading(overview)
  mocks.store.mockReturnValue({ isPending: false, isError: false, data: { colors }, refetch: vi.fn() })
  saving()
})

describe("PopupScreen (BEELINK-306)", () => {
  it("shows the pop-up as saved under its preview, one click back to the coupons", () => {
    show()

    expect(screen.getByRole("heading", { level: 1, name: "Pop-up de primeira compra" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Voltar para cupons" })).toHaveAttribute("href", "/admin/loja/coupons")
    expect(screen.getByRole("switch", { name: "Mostrar o pop-up na loja" })).not.toBeChecked()
    expect(within(preview()).getByText("Ganhe 15% de desconto na primeira compra")).toBeInTheDocument()
    expect(within(preview()).getByText("O pop-up está anunciando 15% de desconto.")).toBeInTheDocument()
  })

  it("draws the preview in the shop's own colours and typeface", () => {
    const { container } = show()

    const painted = container.querySelector("[data-preview-width]")?.parentElement
    expect(painted?.style.getPropertyValue("--shop-primary")).toBe(colors.primary)
    expect(painted?.style.fontFamily).toBe("Figtree")
  })

  it("follows the title as it is typed, with the real benefit where the placeholder is", async () => {
    show()

    await userEvent.type(screen.getByLabelText("Título"), "Ei! {{beneficio} te espera")
    expect(within(preview()).getByText("Ei! 15% de desconto te espera")).toBeInTheDocument()
  })

  it("shows the picture in the preview once the form has one", async () => {
    reading({ ...overview, settings: { ...settings, imageUrl: "https://res.cloudinary.com/demo/popup.jpg" } })
    show()

    expect(preview().querySelector("img")).toHaveAttribute("src", "https://res.cloudinary.com/demo/popup.jpg")
  })

  it("saves the form in the API's shape", async () => {
    show()

    await userEvent.click(screen.getByRole("switch", { name: "Mostrar o pop-up na loja" }))
    await userEvent.type(screen.getByLabelText("Texto do botão"), "Quero meu cupom")
    await userEvent.clear(screen.getByLabelText("Segundos depois de chegar"))
    await userEvent.type(screen.getByLabelText("Segundos depois de chegar"), "8")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))

    expect(mutate).toHaveBeenCalledWith({ enabled: true, imageUrl: null, title: null, text: null, buttonLabel: "Quero meu cupom", trigger: "ON_ARRIVAL", delaySeconds: 8, benefitSource: "AUTO", benefitId: null, keepReminder: false }, expect.anything())
  })

  it("refuses a discount typed by hand before asking the API, and sends nothing", async () => {
    show()

    await userEvent.type(screen.getByLabelText("Título"), "Ganhe 10% agora")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))

    expect(mutate).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Título")).toHaveAccessibleDescription(expect.stringContaining("Não escreva o desconto à mão. Use {beneficio}"))
  })

  it("previews the benefit of the choice saved, and says plainly when it is out of force", () => {
    reading({ ...overview, settings: { ...settings, enabled: true, benefitSource: "COUPON", benefitId: "c1" }, benefit: five })
    const named = show()
    expect(within(preview()).getByText("Ganhe 5% de desconto na primeira compra")).toBeInTheDocument()
    expect(within(preview()).getByText("Ganhar cupom")).toBeInTheDocument()
    named.unmount()

    reading({ ...overview, settings: { ...settings, enabled: true, benefitSource: "COUPON", benefitId: "gone" }, benefit: null })
    show()
    expect(within(preview()).getByText(/O benefício escolhido não está valendo agora\..*não promete desconto nenhum/)).toBeInTheDocument()
    expect(within(preview()).getByText("Crie sua conta na loja")).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Benefício anunciado" })).toHaveTextContent("O benefício escolhido não está valendo")
  })

  it("says clearly that no discount is promised at a shop with no first-purchase benefit", () => {
    reading({ settings: { ...settings, enabled: true }, benefit: null, headline: null, options: [], customerOffer: null })
    show()

    expect(within(preview()).getByText("Sua loja não tem benefício de primeira compra valendo. O pop-up convida a criar a conta e não promete desconto nenhum.")).toBeInTheDocument()
    expect(within(preview()).getByText("Crie sua conta na loja")).toBeInTheDocument()
    expect(within(preview()).getByText("Criar minha conta")).toBeInTheDocument()
    expect(preview()).not.toHaveTextContent(/Ganhe|%/)
    // The fields' placeholders are the plain invitation too: nothing on the screen names a discount.
    expect(screen.getByLabelText("Título")).toHaveAttribute("placeholder", "Crie sua conta na loja")
  })

  it("says the API's refusal in words, and that it was saved", () => {
    saving({ error: new DiscountError("POPUP_BENEFIT_INVALID") })
    const refused = show()
    expect(screen.getByText(/Este benefício não pode ser anunciado/)).toBeInTheDocument()
    refused.unmount()

    saving({ isSuccess: true })
    show()
    expect(screen.getByText("Pop-up salvo.")).toBeInTheDocument()
  })

  it("draws a skeleton while it reads — the pop-up or the shop's colours — and no word about loading", () => {
    mocks.popup.mockReturnValue({ isPending: true, isError: false })
    const { container } = show()

    expect(container.querySelector("[data-slot=skeleton]")).not.toBeNull()
    expect(screen.queryByRole("form")).toBeNull()
    expect(container).not.toHaveTextContent(/carregando|loading/i)
  })

  it("says a read failed, and asks again for both", async () => {
    const refetch = vi.fn()
    mocks.popup.mockReturnValue({ isPending: false, isError: true, refetch })
    show()

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar o pop-up.")
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})

describe("PopupScreen — whom the pop-up speaks to, and the strip as its reminder (BEELINK-310)", () => {
  it("says, in plain words, the two people it speaks to", () => {
    show()

    const intro = screen.getByText(/Um aviso que abre sobre a loja e fala com duas pessoas\./)
    expect(intro).toHaveTextContent("Quem ainda não tem conta lê o convite para se cadastrar")
    expect(intro).toHaveTextContent("Quem já entrou na conta e nunca fez um pedido vê o cupom de primeira compra")
    expect(screen.getByText(/Quem já fez um pedido não vê\./)).toBeInTheDocument()
  })

  // BEELINK-311: closed is closed, and the reminder lives in the cart.
  it("says what happens once the notice is closed, and where the coupon's reminder lives", () => {
    show()

    expect(screen.getByText(/Um aviso que abre sobre a loja/)).toHaveTextContent("Fechado, o aviso não volta nas páginas da loja; quem não aplicou o cupom é lembrado dele no carrinho.")
    expect(screen.getByRole("switch", { name: "Depois de fechado, manter um lembrete abaixo do cabeçalho" })).toHaveAccessibleDescription(/até a pessoa fechar a faixa também; fechada, ela não volta\. Desligado, depois de fechado o pop-up nada mais aparece nas páginas da loja: o lembrete do cupom fica no carrinho\./)
  })

  it("shows the reminder as saved — off for a shop that never said — and sends it with the form", async () => {
    show()
    const reminder = screen.getByRole("switch", { name: "Depois de fechado, manter um lembrete abaixo do cabeçalho" })
    expect(reminder).not.toBeChecked()

    await userEvent.click(reminder)
    expect(reminder).toBeChecked()
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ keepReminder: true, enabled: false }), expect.anything())
  })

  it("reads a reminder saved on", () => {
    reading({ ...overview, settings: { ...settings, enabled: true, keepReminder: true } })
    show()

    expect(screen.getByRole("switch", { name: "Depois de fechado, manter um lembrete abaixo do cabeçalho" })).toBeChecked()
  })

  it("previews the customer's notice with the code the API says is theirs, and none of the visitor's words", async () => {
    show()
    expect(within(preview()).queryByText("PRIMEIRA5")).toBeNull()

    await userEvent.click(within(preview()).getByRole("button", { name: "Cliente sem pedido" }))
    expect(within(preview()).getByText("Seu primeiro pedido tem 5% de desconto")).toBeInTheDocument()
    expect(within(preview()).getByText("PRIMEIRA5")).toBeInTheDocument()
    expect(within(preview()).getByText("Usar no carrinho")).toBeInTheDocument()
    expect(within(preview()).queryByText("Ganhe 15% de desconto na primeira compra")).toBeNull()
  })

  it("keeps the customer's notice as it is while the visitor's sentences are typed: its words are not the shopkeeper's", async () => {
    show()
    await userEvent.type(screen.getByLabelText("Título"), "Cadastre-se já")
    await userEvent.click(within(preview()).getByRole("button", { name: "Cliente sem pedido" }))

    expect(within(preview()).getByText("Seu primeiro pedido tem 5% de desconto")).toBeInTheDocument()
    expect(preview()).not.toHaveTextContent("Cadastre-se já")
  })

  it("says a signed-in customer sees no pop-up at a shop with nothing for a first purchase", async () => {
    reading({ settings: { ...settings, enabled: true }, benefit: null, headline: null, options: [], customerOffer: null })
    show()

    await userEvent.click(within(preview()).getByRole("button", { name: "Cliente sem pedido" }))
    expect(within(preview()).getByText("Sua loja não tem benefício de primeira compra valendo: quem já entrou na conta não vê pop-up.")).toBeInTheDocument()
    expect(preview()).not.toHaveTextContent("Crie sua conta na loja")
  })
})
