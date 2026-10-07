// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { CustomerOffers, StorefrontOffers as Headline } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { useOfferStrip } from "@/stores/offer-strip"

const mocks = vi.hoisted(() => ({ shopperAt: vi.fn(), offersAt: vi.fn(), customerOffersAt: vi.fn() }))
vi.mock("@/lib/shopper", () => ({ shopperAt: mocks.shopperAt }))
vi.mock("@/lib/storefront-data", () => ({ offersAt: mocks.offersAt }))
vi.mock("@/lib/customer-offers", () => ({ customerOffersAt: mocks.customerOffersAt }))

const { StorefrontOffers } = await import("./storefront-offers")

const routeWords = { products: "produtos", categories: "categorias", search: "busca", cart: "carrinho", signIn: "entrar", verifyEmail: "confirmar-email", resetPassword: "nova-senha", account: "conta", accountTabs: { orders: "pedidos", favorites: "favoritos", reviews: "avaliacoes", cashback: "cashback", profile: "perfil", messages: "conversas" } }
const shop = { slug: "loja", type: "ECOMMERCE", routeWords } as Parameters<typeof StorefrontOffers>[0]["store"]
const benefit = { kind: "PERCENT", percentBps: 1000, amountCents: null, minSubtotalCents: 0, endsAt: null } as const
const NOTHING: Headline = { firstPurchase: null }
const PROMOTION: Headline = { firstPurchase: { ...benefit, source: "PROMOTION", wholeCart: true } }
const COUPON: Headline = { firstPurchase: { ...benefit, source: "COUPON", wholeCart: true } }
const never: CustomerOffers = { hasOrder: false, firstPurchase: null, coupons: [] }
const bia = { id: "c1", name: "Bia" }

/** The page's strip for whoever it is drawn for, and what the shop offers. */
async function strip({ shopper = null as typeof bia | null, headline = NOTHING, offers = null as CustomerOffers | null, store = shop, back = "/loja/produtos/magnesio-360" } = {}) {
  mocks.shopperAt.mockResolvedValue(shopper)
  mocks.offersAt.mockResolvedValue(headline)
  mocks.customerOffersAt.mockResolvedValue(offers)
  return render(await StorefrontOffers({ store, back, messages: ptBR }))
}

beforeEach(() => {
  vi.clearAllMocks()
  useOfferStrip.setState({ closed: {} })
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
})
