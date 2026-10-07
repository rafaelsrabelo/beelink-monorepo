// Libs
import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

// Types
import type { CustomerOffers, StorefrontOffers as Headline, StorefrontPopup } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { useOfferStrip } from "@/stores/offer-strip"
import { useShopPopup } from "@/stores/shop-popup"

const mocks = vi.hoisted(() => ({ shopperAt: vi.fn(), offersAt: vi.fn(), customerOffersAt: vi.fn(), popupVisitorAt: vi.fn() }))
vi.mock("@/lib/popup", () => ({ popupVisitorAt: mocks.popupVisitorAt }))
vi.mock("./shop-font", () => ({ figtree: { style: { fontFamily: "Figtree" } } }))
vi.mock("@/lib/shopper", () => ({ shopperAt: mocks.shopperAt }))
vi.mock("@/lib/storefront-data", () => ({ offersAt: mocks.offersAt }))
vi.mock("@/lib/customer-offers", () => ({ customerOffersAt: mocks.customerOffersAt }))

const { StorefrontOffers } = await import("./storefront-offers")

const routeWords = { products: "produtos", categories: "categorias", search: "busca", cart: "carrinho", signIn: "entrar", verifyEmail: "confirmar-email", resetPassword: "nova-senha", account: "conta", accountTabs: { orders: "pedidos", favorites: "favoritos", reviews: "avaliacoes", cashback: "cashback", profile: "perfil", messages: "conversas" } }
const colors = { background: "oklch(1 0 0)", primary: "oklch(0.5 0.2 260)", header: "oklch(1 0 0)", footer: "oklch(0.2 0 0)" }
const shop = { slug: "loja", type: "ECOMMERCE", routeWords, colors } as Parameters<typeof StorefrontOffers>[0]["store"]
const benefit = { kind: "PERCENT", percentBps: 1000, amountCents: null, minSubtotalCents: 0, endsAt: null } as const
const NOTHING: Headline = { firstPurchase: null, popup: null }
const PROMOTION: Headline = { firstPurchase: { ...benefit, source: "PROMOTION", wholeCart: true }, popup: null }
const COUPON: Headline = { firstPurchase: { ...benefit, source: "COUPON", wholeCart: true }, popup: null }
const never: CustomerOffers = { hasOrder: false, firstPurchase: null, coupons: [] }
const bia = { id: "c1", name: "Bia" }

const POPUP: StorefrontPopup = { revision: 3, imageUrl: null, title: null, text: null, buttonLabel: null, trigger: "ON_ARRIVAL", delaySeconds: 5, benefit: COUPON.firstPurchase }
const NEW_HERE = { seen: null, holdsSession: false }

/** The page's strip for whoever it is drawn for, and what the shop offers. */
async function strip({ shopper = null as typeof bia | null, headline = NOTHING, offers = null as CustomerOffers | null, store = shop, back = "/loja/produtos/magnesio-360", visitor = NEW_HERE as { seen: number | null; holdsSession: boolean } } = {}) {
  mocks.popupVisitorAt.mockResolvedValue(visitor)
  mocks.shopperAt.mockResolvedValue(shopper)
  mocks.offersAt.mockResolvedValue(headline)
  mocks.customerOffersAt.mockResolvedValue(offers)
  return render(await StorefrontOffers({ store, back, messages: ptBR }))
}

beforeEach(() => {
  vi.clearAllMocks()
  useOfferStrip.setState({ closed: {} })
  useShopPopup.setState({ open: {}, shown: {} })
})

afterEach(() => {
  vi.useRealTimers()
})

describe("StorefrontOffers", () => {
  describe("a visitor", () => {
    it("is invited to open an account, and comes back to the page they were on", async () => {
      await strip()

      expect(screen.getByRole("region", { name: "Oferta da loja" })).toHaveTextContent("Crie sua conta para acompanhar seus pedidos, salvar favoritos e comprar mais rápido.")
      expect(screen.getByRole("link", { name: "Criar conta" })).toHaveAttribute("href", "/loja/entrar?modo=criar&voltar=%2Floja%2Fprodutos%2Fmagnesio-360")
      // A visitor's page asks nothing of a shopper's.
      expect(mocks.customerOffersAt).not.toHaveBeenCalled()
    })

    it("is told the shop's first-purchase benefit where there is one", async () => {
      await strip({ headline: PROMOTION })

      expect(screen.getByRole("region", { name: "Oferta da loja" })).toHaveTextContent("Crie sua conta e ganhe 10% de desconto no primeiro pedido.")
    })

    it("is never shown a code, nor a way to copy one", async () => {
      await strip({ headline: COUPON })

      expect(screen.getByRole("region", { name: "Oferta da loja" }).querySelector("strong")).toBeNull()
      expect(screen.queryByRole("button", { name: "Copiar" })).toBeNull()
      expect(screen.queryByRole("link", { name: "Usar no carrinho" })).toBeNull()
    })
  })

  describe("a signed-in shopper who never ordered", () => {
    it("is shown the first-order coupon, its code and the way to the cart that applies it", async () => {
      await strip({ shopper: bia, headline: COUPON, offers: { ...never, firstPurchase: { ...benefit, source: "COUPON", code: "PRIMEIRA10" } } })

      const region = screen.getByRole("region", { name: "Oferta da loja" })
      expect(region).toHaveTextContent("Seu primeiro pedido tem 10% de desconto com o cupom PRIMEIRA10")
      expect(screen.getByRole("link", { name: "Usar no carrinho" })).toHaveAttribute("href", "/loja/carrinho?cupom=PRIMEIRA10")
      expect(screen.getByRole("button", { name: "Copiar" })).toHaveAccessibleDescription("PRIMEIRA10")
      expect(screen.queryByRole("link", { name: "Criar conta" })).toBeNull()
      // About no cart: the strip asks who they are to the shop, and nothing else.
      expect(mocks.customerOffersAt).toHaveBeenCalledWith("loja")
    })

    it("is told a promotion applies by itself", async () => {
      await strip({ shopper: bia, headline: PROMOTION, offers: { ...never, firstPurchase: { ...benefit, source: "PROMOTION", wholeCart: true } } })

      expect(screen.getByRole("region", { name: "Oferta da loja" })).toHaveTextContent("Seu primeiro pedido tem 10% de desconto, aplicado automaticamente.")
      expect(screen.queryByRole("link")).toBeNull()
    })

    // No generic strip — and at a shop with nothing for a first order, not even the question.
    it("is shown nothing at a shop with nothing for a first order, and costs the API no call", async () => {
      const { container } = await strip({ shopper: bia, headline: NOTHING, offers: never })

      expect(container).toBeEmptyDOMElement()
      expect(mocks.customerOffersAt).not.toHaveBeenCalled()
    })
  })

  it("shows nothing to a shopper with an order that stands", async () => {
    const { container } = await strip({ shopper: bia, headline: COUPON, offers: { hasOrder: true, firstPurchase: null, coupons: [] } })

    expect(container).toBeEmptyDOMElement()
  })

  it("shows nothing to a shopper whose offers could not be read, rather than the visitor's invitation", async () => {
    const { container } = await strip({ shopper: bia, headline: PROMOTION, offers: null })

    expect(container).toBeEmptyDOMElement()
  })

  it("shows nothing at a site, which has no account to open", async () => {
    const { container } = await strip({ store: { ...shop, type: "INSTITUTIONAL" } })

    expect(container).toBeEmptyDOMElement()
    expect(mocks.offersAt).not.toHaveBeenCalled()
  })

  describe("closing it", () => {
    it("takes it off the page, and keeps it off while the page lives — a redraw does not bring it back", async () => {
      const view = await strip({ headline: PROMOTION })

      await userEvent.click(screen.getByRole("button", { name: "Fechar aviso" }))
      expect(screen.queryByRole("region", { name: "Oferta da loja" })).toBeNull()

      view.rerender(await StorefrontOffers({ store: shop, back: "/loja/busca?q=whey", messages: ptBR }))
      expect(screen.queryByRole("region", { name: "Oferta da loja" })).toBeNull()
    })

    // Kept in memory alone: a cookie would be one more for the privacy text to list, and none is written.
    it("writes no cookie", async () => {
      const cookieBefore = document.cookie
      await strip({ headline: PROMOTION })

      await userEvent.click(screen.getByRole("button", { name: "Fechar aviso" }))

      expect(document.cookie).toBe(cookieBefore)
    })

    it("is one shop's: another shop's strip is still there", async () => {
      useOfferStrip.getState().close("vizinha")
      await strip({ headline: PROMOTION })

      expect(screen.getByRole("region", { name: "Oferta da loja" })).toBeInTheDocument()
    })
  })

  describe("the first-purchase pop-up (BEELINK-306)", () => {
    const popup = () => screen.queryByRole("dialog")
    const afterItsDelay = () => act(() => vi.advanceTimersByTime(POPUP.delaySeconds * 1000))
    const withPopup = (headline: Headline, popup: Partial<StorefrontPopup> = {}): Headline => ({ ...headline, popup: { ...POPUP, ...popup } })

    beforeEach(() => {
      vi.useFakeTimers()
    })

    it("calls a visitor, with the benefit the API read and the way back to this page", async () => {
      await strip({ headline: withPopup(COUPON) })
      expect(popup()).toBeNull()

      afterItsDelay()
      expect(screen.getByRole("dialog", { name: "Ganhe 10% de desconto na primeira compra" })).toBeInTheDocument()
      expect(screen.getByRole("link", { name: "Ganhar cupom" })).toHaveAttribute("href", "/loja/entrar?modo=criar&voltar=%2Floja%2Fprodutos%2Fmagnesio-360")
    })

    it("is never shown a code, nor asked for a name, an e-mail or a phone", async () => {
      await strip({ headline: withPopup(COUPON) })
      afterItsDelay()

      const dialog = screen.getByRole("dialog")
      expect(dialog.querySelector("input, form, strong")).toBeNull()
      expect(dialog).not.toHaveTextContent(/PRIMEIRA|cupom [A-Z0-9]{4,}/)
    })

    it("fills the shopkeeper's own sentence with the benefit's number, never one typed", async () => {
      await strip({ headline: withPopup(PROMOTION, { title: "Ei! {beneficio} te espera", buttonLabel: "Eu quero", benefit: PROMOTION.firstPurchase }) })
      afterItsDelay()

      expect(screen.getByRole("dialog", { name: "Ei! 10% de desconto te espera" })).toBeInTheDocument()
      expect(screen.getByRole("link", { name: "Eu quero" })).toBeInTheDocument()
    })

    it("invites plainly, promising nothing, at a shop whose pop-up has no benefit in force", async () => {
      await strip({ headline: withPopup(NOTHING, { title: "Ganhe {beneficio} agora", benefit: null }) })
      afterItsDelay()

      const dialog = screen.getByRole("dialog", { name: "Crie sua conta na loja" })
      expect(dialog).not.toHaveTextContent(/desconto|cupom|%|\{beneficio\}/)
      expect(screen.getByRole("link", { name: "Criar minha conta" })).toBeInTheDocument()
    })

    it("wears the shop's colours and typeface, handed to the dialog itself", async () => {
      await strip({ headline: withPopup(COUPON) })
      afterItsDelay()

      const dialog = screen.getByRole("dialog")
      expect(dialog.style.getPropertyValue("--shop-primary")).toBe(colors.primary)
      expect(dialog.style.fontFamily).toBe("Figtree")
    })

    it("is not there at a shop with none: off, or never configured", async () => {
      await strip({ headline: COUPON })

      afterItsDelay()
      expect(popup()).toBeNull()
    })

    it("is not for a signed-in shopper, whether or not they ordered", async () => {
      await strip({ shopper: bia, headline: withPopup(COUPON), offers: { ...never, firstPurchase: { ...benefit, source: "COUPON", code: "PRIMEIRA10" } } })
      act(() => vi.advanceTimersByTime(600_000))
      expect(popup()).toBeNull()
      // Their own strip is what they see.
      expect(screen.getByRole("link", { name: "Usar no carrinho" })).toBeInTheDocument()
    })

    it("is not for a browser that holds a shopper's session whose token ran out", async () => {
      await strip({ headline: withPopup(COUPON), visitor: { seen: null, holdsSession: true } })

      act(() => vi.advanceTimersByTime(600_000))
      expect(popup()).toBeNull()
    })

    it("is not for a visitor who closed it as it stands — and is again once the shopkeeper changed it", async () => {
      const closed = await strip({ headline: withPopup(COUPON), visitor: { seen: 3, holdsSession: false } })
      act(() => vi.advanceTimersByTime(600_000))
      expect(popup()).toBeNull()
      // The strip stays: the calm reminder.
      expect(screen.getByRole("region", { name: "Oferta da loja" })).toBeInTheDocument()
      closed.unmount()

      await strip({ headline: withPopup(COUPON, { revision: 4 }), visitor: { seen: 3, holdsSession: false } })
      afterItsDelay()
      expect(popup()).toBeInTheDocument()
    })

    it("is not at a site, which has no account to open", async () => {
      await strip({ store: { ...shop, type: "INSTITUTIONAL" }, headline: withPopup(COUPON) })

      act(() => vi.advanceTimersByTime(600_000))
      expect(popup()).toBeNull()
    })

    // Where the shop speaks of offers is one notion, the strip's: the pop-up is mounted by this
    // component and by nothing else, so it shows on the pages that hand this to the frame — the
    // home, the listings and the product — and on no other.
    it("is mounted by this component alone, on the pages the strip is on and nowhere else", () => {
      const src = join(process.cwd(), "src")
      const files = (dir: string): string[] => readdirSync(dir).flatMap((name) => (statSync(join(dir, name)).isDirectory() ? files(join(dir, name)) : /\.tsx?$/.test(name) && !/\.test\./.test(name) ? [join(dir, name)] : []))
      const naming = (pattern: RegExp) => files(src).filter((file) => pattern.test(readFileSync(file, "utf8"))).map((file) => file.slice(src.length + 1)).sort()

      expect(naming(/<StorefrontPopupLive$/m)).toEqual(["components/storefront/storefront-offers.tsx"])
      expect(naming(/<StorefrontOffers store=/)).toEqual(["app/[slug]/[section]/[item]/page.tsx", "app/[slug]/[section]/page.tsx", "app/[slug]/page.tsx"])
      // The panel and its design preview are another tree altogether.
      expect(naming(/StorefrontPopupLive|<StorefrontOffers store=/).filter((file) => file.startsWith("app/(admin)") || file.startsWith("components/design"))).toEqual([])
    })
  })
})
