// Libs
import { act, render, screen } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

// Types
import type { CustomerOffers, StorefrontOffers as Headline, StorefrontPopup } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import type { PopupVisitor as Visitor } from "@/lib/popup"
import { POPUP_MAX_AGE_SECONDS, decodePopupSeen } from "@/lib/popup-cookie"
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
const NOTHING: Headline = { firstPurchase: null, firstOrder: null, popup: null }
const PROMOTION: Headline = { firstPurchase: { ...benefit, source: "PROMOTION", wholeCart: true }, firstOrder: { ...benefit, source: "PROMOTION", wholeCart: true }, popup: null }
const COUPON: Headline = { firstPurchase: { ...benefit, source: "COUPON", wholeCart: true }, firstOrder: { ...benefit, source: "COUPON", code: "PRIMEIRA10" }, popup: null }
const never: CustomerOffers = { hasOrder: false, firstPurchase: null, coupons: [] }
const bia = { id: "c1", name: "Bia" }

const POPUP: StorefrontPopup = { revision: 3, imageUrl: null, title: null, text: null, buttonLabel: null, trigger: "ON_ARRIVAL", delaySeconds: 5, benefit: COUPON.firstPurchase, keepReminder: true }
const NEW_HERE: Visitor = { seen: null, holdsSession: false }
/** What a browser kept from before: the invitation to open an account, which no page says any more. */
const closedInvitation = (revision: number): Visitor => ({ seen: { notice: "VISITOR", surface: "DIALOG", revision }, holdsSession: false })
const EXPIRED: Visitor = { seen: null, holdsSession: true }
const closedCoupon = (revision: number): Visitor => ({ seen: { notice: "CUSTOMER", surface: "DIALOG", revision }, holdsSession: false })
/** A browser as its `bl_popup` reads on the server. */
const holding = (cookie: string): Visitor => ({ seen: decodePopupSeen(cookie), holdsSession: false })
/** Every `Set-Cookie` the page writes from here on, as `name=value`. */
function cookiesWritten(): string[] {
  const written: string[] = []
  vi.spyOn(document, "cookie", "set").mockImplementation((value) => void written.push(value))
  return written
}
const withCoupon: CustomerOffers = { hasOrder: false, firstPurchase: { ...benefit, source: "COUPON", code: "PRIMEIRA10" }, coupons: [] }
const withPromotion: CustomerOffers = { hasOrder: false, firstPurchase: { ...benefit, source: "PROMOTION", wholeCart: true }, coupons: [] }

/** The page's strip for whoever it is drawn for, and what the shop offers. */
async function strip({ shopper = null as typeof bia | null, headline = NOTHING, offers = null as CustomerOffers | null, store = shop, visitor = NEW_HERE } = {}) {
  mocks.popupVisitorAt.mockResolvedValue(visitor)
  mocks.shopperAt.mockResolvedValue(shopper)
  mocks.offersAt.mockResolvedValue(headline)
  mocks.customerOffersAt.mockResolvedValue(offers)
  return render(await StorefrontOffers({ store, messages: ptBR }))
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
  // Buying asks no account, and a first order is priced by the buyer's phone: the benefit is theirs.
  describe("somebody not signed in", () => {
    it("is shown the first-order coupon, its code and the way to the cart that applies it — no account asked", async () => {
      await strip({ headline: COUPON })

      expect(screen.getByRole("region", { name: "Oferta da loja" })).toHaveTextContent("Seu primeiro pedido tem 10% de desconto com o cupom PRIMEIRA10")
      expect(screen.getByRole("link", { name: "Usar no carrinho" })).toHaveAttribute("href", "/loja/carrinho?cupom=PRIMEIRA10")
      expect(screen.getByRole("button", { name: "Copiar" })).toHaveAccessibleDescription("PRIMEIRA10")
      expect(screen.queryByRole("link", { name: "Criar conta" })).toBeNull()
      // Nobody's own offers to read: the shop's public one is the answer.
      expect(mocks.customerOffersAt).not.toHaveBeenCalled()
    })

    it("is told a promotion applies by itself", async () => {
      await strip({ headline: PROMOTION })

      expect(screen.getByRole("region", { name: "Oferta da loja" })).toHaveTextContent("Seu primeiro pedido tem 10% de desconto, aplicado automaticamente.")
      expect(screen.queryByRole("link")).toBeNull()
    })

    // The owner's words: "essa questão de criar conta pra fazer algo não precisa mais".
    it("is shown nothing at a shop with nothing for a first order — no strip invites anyone to open an account", async () => {
      const { container } = await strip({ headline: NOTHING })

      expect(container).toBeEmptyDOMElement()
    })

    it("is shown nothing in a browser holding a session whose token ran out: it may be somebody who has ordered", async () => {
      const { container } = await strip({ headline: COUPON, visitor: EXPIRED })

      expect(container).toBeEmptyDOMElement()
    })
  })

  describe("a signed-in shopper who never ordered", () => {
    it("is shown the first-order coupon, its code and the way to the cart that applies it", async () => {
      await strip({ shopper: bia, headline: COUPON, offers: withCoupon })

      const region = screen.getByRole("region", { name: "Oferta da loja" })
      expect(region).toHaveTextContent("Seu primeiro pedido tem 10% de desconto com o cupom PRIMEIRA10")
      expect(screen.getByRole("link", { name: "Usar no carrinho" })).toHaveAttribute("href", "/loja/carrinho?cupom=PRIMEIRA10")
      // About no cart: the strip asks who they are to the shop, and nothing else.
      expect(mocks.customerOffersAt).toHaveBeenCalledWith("loja")
    })

    it("is told a promotion applies by itself", async () => {
      await strip({ shopper: bia, headline: PROMOTION, offers: withPromotion })

      expect(screen.getByRole("region", { name: "Oferta da loja" })).toHaveTextContent("Seu primeiro pedido tem 10% de desconto, aplicado automaticamente.")
      expect(screen.queryByRole("link")).toBeNull()
    })

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

  it("shows nothing to a shopper whose offers could not be read, rather than the shop's public offer", async () => {
    const { container } = await strip({ shopper: bia, headline: PROMOTION, offers: null })

    expect(container).toBeEmptyDOMElement()
  })

  it("shows nothing at a site, which sells nothing to offer", async () => {
    const { container } = await strip({ store: { ...shop, type: "INSTITUTIONAL" } })

    expect(container).toBeEmptyDOMElement()
    expect(mocks.offersAt).not.toHaveBeenCalled()
  })

  describe("closing it", () => {
    it("takes it off the page, and keeps it off while the page lives — a redraw does not bring it back", async () => {
      const view = await strip({ headline: PROMOTION })

      await userEvent.click(screen.getByRole("button", { name: "Fechar aviso" }))
      expect(screen.queryByRole("region", { name: "Oferta da loja" })).toBeNull()

      view.rerender(await StorefrontOffers({ store: shop, messages: ptBR }))
      expect(screen.queryByRole("region", { name: "Oferta da loja" })).toBeNull()
    })

    // BEELINK-311: closed is remembered — in the shop's own `bl_popup`, at revision 0 where no pop-up is on.
    it("remembers it in the shop's cookie, as the first-order strip, signed in or not", async () => {
      const written = cookiesWritten()

      const anyone = await strip({ headline: COUPON })
      await userEvent.click(screen.getByRole("button", { name: "Fechar aviso" }))
      anyone.unmount()
      useOfferStrip.setState({ closed: {} })

      await strip({ shopper: bia, headline: COUPON, offers: withCoupon })
      await userEvent.click(screen.getByRole("button", { name: "Fechar aviso" }))

      const cookie = `bl_popup=3000000000; Path=/loja; Max-Age=${POPUP_MAX_AGE_SECONDS}; SameSite=Lax`
      expect(written).toEqual([cookie, cookie])
    })

    it("counts using it as closing it: the way to the cart", async () => {
      const written = cookiesWritten()
      await strip({ headline: COUPON })
      const link = screen.getByRole("link", { name: "Usar no carrinho" })
      // jsdom follows no link; the press is what is asked about.
      link.addEventListener("click", (event) => event.preventDefault())
      await userEvent.click(link)

      expect(written.map((cookie) => cookie.split(";")[0])).toEqual(["bl_popup=3000000000"])
    })

    // Whoever copied the code may still want the way to the cart: copying dismisses nothing.
    it("does not count copying the code: the strip stays, and nothing is written", async () => {
      const written = cookiesWritten()
      await strip({ headline: COUPON })

      await userEvent.click(screen.getByRole("button", { name: "Copiar" }))

      expect(written).toEqual([])
      expect(screen.getByRole("region", { name: "Oferta da loja" })).toBeInTheDocument()
    })

    it("writes nothing by being seen", async () => {
      const written = cookiesWritten()
      await strip({ headline: PROMOTION })

      expect(written).toEqual([])
    })

    it("is not in what the server renders once the cookie says it was closed", async () => {
      mocks.popupVisitorAt.mockResolvedValue(holding("3000000000"))
      mocks.shopperAt.mockResolvedValue(null)
      mocks.offersAt.mockResolvedValue(COUPON)
      const anyoneHtml = renderToStaticMarkup(await StorefrontOffers({ store: shop, messages: ptBR }))

      mocks.shopperAt.mockResolvedValue(bia)
      mocks.customerOffersAt.mockResolvedValue(withCoupon)
      const customerHtml = renderToStaticMarkup(await StorefrontOffers({ store: shop, messages: ptBR }))

      expect(anyoneHtml).toBe("")
      expect(customerHtml).toBe("")
    })

    it("is one shop's: another shop's strip is still there", async () => {
      useOfferStrip.getState().close("vizinha")
      await strip({ headline: PROMOTION })

      expect(screen.getByRole("region", { name: "Oferta da loja" })).toBeInTheDocument()
    })
  })

  describe("the first-purchase pop-up (BEELINK-306), to somebody not signed in", () => {
    const popup = () => screen.queryByRole("dialog")
    const afterItsDelay = () => act(() => vi.advanceTimersByTime(POPUP.delaySeconds * 1000))
    const withPopup = (headline: Headline, popup: Partial<StorefrontPopup> = {}): Headline => ({ ...headline, popup: { ...POPUP, ...popup } })

    beforeEach(() => {
      vi.useFakeTimers()
    })

    it("tells the shop's first-order coupon: the benefit, the code, a way to copy it and the cart that applies it", async () => {
      await strip({ headline: withPopup(COUPON) })
      expect(popup()).toBeNull()

      afterItsDelay()
      const dialog = screen.getByRole("dialog", { name: "Seu primeiro pedido tem 10% de desconto" })
      expect(dialog.querySelector("[data-popup-code]")).toHaveTextContent("PRIMEIRA10")
      expect(screen.getByRole("button", { name: "Copiar" })).toHaveAccessibleDescription("PRIMEIRA10")
      expect(screen.getByRole("link", { name: "Usar no carrinho" })).toHaveAttribute("href", "/loja/carrinho?cupom=PRIMEIRA10")
    })

    it("says a promotion applies by itself, with one button that only closes", async () => {
      await strip({ headline: withPopup(PROMOTION) })
      afterItsDelay()

      const dialog = screen.getByRole("dialog", { name: "Seu primeiro pedido tem 10% de desconto" })
      expect(dialog).toHaveAccessibleDescription("Aplicado automaticamente no seu primeiro pedido. Não precisa de código.")
      expect(dialog.querySelector("a")).toBeNull()
    })

    // The shopkeeper's title, text and button were written as an invitation to open an account.
    it("never says the shopkeeper's sentences, nor leads to the sign-up, nor asks for anything", async () => {
      await strip({ headline: withPopup(COUPON, { title: "Crie sua conta e ganhe {beneficio}", text: "Cadastre-se agora", buttonLabel: "Quero me cadastrar" }) })
      afterItsDelay()

      const dialog = screen.getByRole("dialog")
      expect(dialog).not.toHaveTextContent(/Crie sua conta|Cadastre-se|Quero me cadastrar/)
      expect(dialog.querySelector('a[href*="entrar"]')).toBeNull()
      expect(dialog.querySelector("input, form")).toBeNull()
    })

    it("is not opened at a shop with no first-order benefit, whatever the shopkeeper wrote", async () => {
      await strip({ headline: withPopup(NOTHING, { title: "Ganhe {beneficio} agora", benefit: null }) })

      act(() => vi.advanceTimersByTime(600_000))
      expect(popup()).toBeNull()
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

    it("is not for a browser that holds a shopper's session whose token ran out", async () => {
      await strip({ headline: withPopup(COUPON), visitor: EXPIRED })

      act(() => vi.advanceTimersByTime(600_000))
      expect(popup()).toBeNull()
    })

    it("is not for somebody who closed it as it stands — and is again once the shopkeeper changed it", async () => {
      const closed = await strip({ headline: withPopup(COUPON), visitor: closedCoupon(3) })
      act(() => vi.advanceTimersByTime(600_000))
      expect(popup()).toBeNull()
      // The strip is what remains: the calm reminder.
      expect(screen.getByRole("region", { name: "Oferta da loja" })).toBeInTheDocument()
      closed.unmount()

      await strip({ headline: withPopup(COUPON, { revision: 4 }), visitor: closedCoupon(3) })
      afterItsDelay()
      expect(popup()).toBeInTheDocument()
    })

    it("is shown once to a browser that only ever closed the old invitation: the code is news", async () => {
      await strip({ headline: withPopup(COUPON), visitor: closedInvitation(3) })
      afterItsDelay()

      expect(screen.getByRole("dialog", { name: "Seu primeiro pedido tem 10% de desconto" })).toBeInTheDocument()
    })

    it("is not at a site, which sells nothing to offer", async () => {
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

  describe("the pop-up for a signed-in customer who never ordered (BEELINK-310)", () => {
    const popup = () => screen.queryByRole("dialog")
    const afterItsDelay = () => act(() => vi.advanceTimersByTime(POPUP.delaySeconds * 1000))
    const forever = () => act(() => vi.advanceTimersByTime(600_000))
    const withPopup = (headline: Headline, popup: Partial<StorefrontPopup> = {}): Headline => ({ ...headline, popup: { ...POPUP, ...popup } })

    beforeEach(() => {
      vi.useFakeTimers()
    })

    it("opens the dialog with their coupon: the benefit, the code, a way to copy it and the cart that applies it", async () => {
      await strip({ shopper: bia, headline: withPopup(COUPON), offers: withCoupon })
      expect(popup()).toBeNull()

      afterItsDelay()
      const dialog = screen.getByRole("dialog", { name: "Seu primeiro pedido tem 10% de desconto" })
      expect(dialog).toHaveAttribute("aria-modal", "true")
      expect(dialog).toHaveAccessibleDescription("Use este cupom no carrinho:")
      expect(dialog.querySelector("[data-popup-code]")).toHaveTextContent("PRIMEIRA10")
      expect(screen.getByRole("link", { name: "Usar no carrinho" })).toHaveAttribute("href", "/loja/carrinho?cupom=PRIMEIRA10")
    })

    it("says a promotion applies by itself, with no code and one button that only closes", async () => {
      await strip({ shopper: bia, headline: withPopup(PROMOTION), offers: withPromotion })
      afterItsDelay()

      const dialog = screen.getByRole("dialog", { name: "Seu primeiro pedido tem 10% de desconto" })
      expect(dialog.querySelector("[data-popup-code]")).toBeNull()
      act(() => screen.getByRole("button", { name: "Continuar comprando" }).click())
      expect(popup()).toBeNull()
    })

    // One rule, the strip's: what the customer's own offers answer, not what the pop-up's benefit names.
    it("tells what the strip would tell them — their coupon — even where the pop-up names a promotion", async () => {
      await strip({ shopper: bia, headline: withPopup(PROMOTION, { benefit: { ...benefit, percentBps: 2000, source: "PROMOTION", wholeCart: true } }), offers: withCoupon })
      afterItsDelay()

      expect(screen.getByRole("dialog", { name: "Seu primeiro pedido tem 10% de desconto" })).toBeInTheDocument()
      expect(screen.getByRole("dialog")).not.toHaveTextContent("20%")
    })

    it("reuses the picture the shopkeeper configured, and the shop's colours", async () => {
      await strip({ shopper: bia, headline: withPopup(COUPON, { imageUrl: "https://img.test/popup.jpg" }), offers: withCoupon })
      afterItsDelay()

      const dialog = screen.getByRole("dialog")
      expect(dialog.querySelector("img")).toHaveAttribute("src", "https://img.test/popup.jpg")
      expect(dialog.style.getPropertyValue("--shop-primary")).toBe(colors.primary)
    })

    it("is never opened for a customer with an order that stands", async () => {
      const { container } = await strip({ shopper: bia, headline: withPopup(COUPON), offers: { hasOrder: true, firstPurchase: null, coupons: [] } })

      forever()
      expect(popup()).toBeNull()
      expect(container).toBeEmptyDOMElement()
    })

    it("is not opened for a customer with no benefit to be told", async () => {
      const { container } = await strip({ shopper: bia, headline: withPopup(COUPON), offers: never })

      forever()
      expect(popup()).toBeNull()
      expect(container).toBeEmptyDOMElement()
    })

    it("is not opened, and nothing is said, when the customer's offers could not be read", async () => {
      const { container } = await strip({ shopper: bia, headline: withPopup(COUPON), offers: null })

      forever()
      expect(container).toBeEmptyDOMElement()
    })

    it("asks the API nothing more than the strip did: one read of their offers, about no cart", async () => {
      await strip({ shopper: bia, headline: withPopup(COUPON), offers: withCoupon })

      expect(mocks.customerOffersAt).toHaveBeenCalledTimes(1)
      expect(mocks.customerOffersAt).toHaveBeenCalledWith("loja")
    })

    describe("once per person, in the one cookie", () => {
      it("is not shown again to a customer who closed it — and is, once, when the shopkeeper changes the pop-up", async () => {
        const closed = await strip({ shopper: bia, headline: withPopup(COUPON), offers: withCoupon, visitor: closedCoupon(3) })
        forever()
        expect(popup()).toBeNull()
        closed.unmount()

        await strip({ shopper: bia, headline: withPopup(COUPON, { revision: 4 }), offers: withCoupon, visitor: closedCoupon(3) })
        afterItsDelay()
        expect(popup()).toBeInTheDocument()
      })

      it("is not shown again, signed out, to a browser that closed it signed in: it is one notice", async () => {
        await strip({ headline: withPopup(COUPON), visitor: closedCoupon(3) })

        forever()
        expect(popup()).toBeNull()
      })

      it("writes the first-order notice's version when closed, signed in or not", async () => {
        const written: string[] = []
        vi.spyOn(document, "cookie", "set").mockImplementation((value) => void written.push(value))

        const customer = await strip({ shopper: bia, headline: withPopup(COUPON), offers: withCoupon })
        afterItsDelay()
        act(() => screen.getByRole("button", { name: "Fechar" }).click())
        customer.unmount()
        useShopPopup.setState({ open: {}, shown: {} })

        await strip({ headline: withPopup(COUPON) })
        afterItsDelay()
        act(() => screen.getByRole("button", { name: "Fechar" }).click())

        expect(written.map((cookie) => cookie.split(";")[0])).toEqual(["bl_popup=1000000003", "bl_popup=1000000003"])
        vi.restoreAllMocks()
      })
    })
  })

  describe("the strip beside the pop-up (BEELINK-310)", () => {
    const stripRegion = () => screen.queryByRole("region", { name: "Oferta da loja" })
    const withPopup = (headline: Headline, popup: Partial<StorefrontPopup> = {}): Headline => ({ ...headline, popup: { ...POPUP, ...popup } })

    describe("at a shop whose pop-up is off", () => {
      it("draws the first-order strip for anyone who never ordered, in a browser that closed nothing", async () => {
        const anyone = await strip({ headline: COUPON })
        expect(stripRegion()).toHaveTextContent("Seu primeiro pedido tem 10% de desconto com o cupom PRIMEIRA10")
        anyone.unmount()

        await strip({ shopper: bia, headline: COUPON, offers: withCoupon })
        expect(stripRegion()).toHaveTextContent("Seu primeiro pedido tem 10% de desconto com o cupom PRIMEIRA10")
        expect(screen.queryByRole("dialog")).toBeNull()
      })

      // BEELINK-311: the owner's "aparecer só uma vez e o cliente fecha, salva no browser isso".
      it("draws none once it was closed here — and none for a dialog closed while the pop-up was on", async () => {
        for (const cookie of ["3000000000", "1000000001", "3000000007"]) {
          const anyone = await strip({ headline: COUPON, visitor: holding(cookie) })
          expect(stripRegion()).toBeNull()
          anyone.unmount()

          const customer = await strip({ shopper: bia, headline: COUPON, offers: withCoupon, visitor: holding(cookie) })
          expect(stripRegion()).toBeNull()
          expect(customer.container).not.toHaveTextContent("PRIMEIRA10")
          customer.unmount()
        }
      })

      it("still tells the coupon once to a browser that closed the old invitation", async () => {
        const written = cookiesWritten()
        await strip({ headline: COUPON, visitor: holding("2000000000") })

        expect(stripRegion()).toHaveTextContent("Seu primeiro pedido tem 10% de desconto com o cupom PRIMEIRA10")
        await userEvent.click(screen.getByRole("button", { name: "Fechar aviso" }))
        expect(written.map((cookie) => cookie.split(";")[0])).toEqual(["bl_popup=3000000000"])
      })

      // A shop that had its pop-up on at revision 5 and switched it off: the closing is not written back at 0.
      it("remembers a closing at the revision the cookie already holds, never one before it", async () => {
        const written = cookiesWritten()
        await strip({ headline: COUPON, visitor: holding("5") })

        await userEvent.click(screen.getByRole("button", { name: "Fechar aviso" }))
        expect(written.map((cookie) => cookie.split(";")[0])).toEqual(["bl_popup=3000000005"])
      })
    })

    describe("while the dialog is still due", () => {
      it("is not drawn: the dialog comes first, and the HTML holds no strip — nor the code — under it", async () => {
        for (const viewer of [{}, { shopper: bia, offers: withCoupon }]) {
          const view = await strip({ headline: withPopup(COUPON), ...viewer })
          // Before the dialog even opens: nothing was served to flash.
          expect(stripRegion()).toBeNull()
          expect(view.container.querySelector("[data-offer-strip]")).toBeNull()
          expect(view.container).not.toHaveTextContent("PRIMEIRA10")
          view.unmount()
        }
      })

      it("does not arrive at the click that closes the dialog: nothing moves under the pointer", async () => {
        vi.useFakeTimers()
        await strip({ headline: withPopup(COUPON) })
        act(() => vi.advanceTimersByTime(POPUP.delaySeconds * 1000))

        act(() => screen.getByRole("button", { name: "Fechar" }).click())
        expect(screen.queryByRole("dialog")).toBeNull()
        expect(stripRegion()).toBeNull()
      })
    })

    describe("once the dialog was closed, with the reminder kept", () => {
      it("is the coupon, with its code within reach, signed in or not", async () => {
        const anyone = await strip({ headline: withPopup(COUPON), visitor: closedCoupon(3) })
        expect(stripRegion()).toHaveTextContent("Seu primeiro pedido tem 10% de desconto com o cupom PRIMEIRA10")
        anyone.unmount()

        await strip({ shopper: bia, headline: withPopup(COUPON), offers: withCoupon, visitor: closedCoupon(3) })
        expect(screen.getByRole("button", { name: "Copiar" })).toBeInTheDocument()
      })

      it("is not drawn for a browser holding a session the page could not read", async () => {
        await strip({ headline: withPopup(COUPON), visitor: EXPIRED })

        expect(stripRegion()).toBeNull()
      })

      // BEELINK-311: the reminder closes for good too, at the pop-up's revision.
      it("is closed for good by its own \"×\": the cookie takes the strip's number, and the next page has neither", async () => {
        const written = cookiesWritten()
        const first = await strip({ headline: withPopup(COUPON), visitor: closedCoupon(3) })
        await userEvent.click(screen.getByRole("button", { name: "Fechar aviso" }))
        first.unmount()
        useOfferStrip.setState({ closed: {} })
        expect(written.map((cookie) => cookie.split(";")[0])).toEqual(["bl_popup=3000000003"])

        vi.useFakeTimers()
        const next = await strip({ headline: withPopup(COUPON), visitor: holding("3000000003") })
        act(() => vi.advanceTimersByTime(60_000))
        expect(stripRegion()).toBeNull()
        expect(screen.queryByRole("dialog")).toBeNull()
        expect(next.container).not.toHaveTextContent("PRIMEIRA10")
      })

      it("comes back once, after the dialog, when the shopkeeper changes the pop-up", async () => {
        vi.useFakeTimers()
        await strip({ headline: withPopup(COUPON, { revision: 4 }), visitor: holding("3000000003") })
        expect(stripRegion()).toBeNull()

        act(() => vi.advanceTimersByTime(POPUP.delaySeconds * 1000))
        expect(screen.getByRole("dialog")).toBeInTheDocument()
      })
    })

    describe("with the reminder switched off", () => {
      const off = (headline: Headline) => withPopup(headline, { keepReminder: false })

      it("is never drawn at that shop: not before the dialog, not after it was closed, to nobody", async () => {
        for (const visitor of [NEW_HERE, closedInvitation(3), closedCoupon(3), holding("1"), holding("1000000001"), EXPIRED]) {
          const anyone = await strip({ headline: off(COUPON), visitor })
          expect(stripRegion()).toBeNull()
          anyone.unmount()

          const customer = await strip({ shopper: bia, headline: off(COUPON), offers: withCoupon, visitor })
          expect(stripRegion()).toBeNull()
          customer.unmount()
        }
      })

      it("still opens the dialog for whoever it is due to", async () => {
        vi.useFakeTimers()
        await strip({ headline: off(COUPON) })

        act(() => vi.advanceTimersByTime(POPUP.delaySeconds * 1000))
        expect(screen.getByRole("dialog", { name: "Seu primeiro pedido tem 10% de desconto" })).toBeInTheDocument()
      })
    })
  })
})
