// Libs
import { describe, expect, it } from "vitest"

// Types
import type { AffiliateHome, AffiliateOrder } from "@harness-monorepo/contracts"

// UI
import { defaultMessages } from "@harness-monorepo/ui/locales/index"

// App
import { affiliateShopHrefOf, areaTabOf, homeViewOf, orderViewOf, productLinkViewOf, shopCardOf } from "./affiliate-area-view"
import { profileFormOf, profilePatchOf } from "./affiliate-profile-form"

const text = defaultMessages.affiliateArea
const money = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`
const words = { money, day: (day: string) => `dia ${day.slice(8)}`, date: (iso: string) => iso.slice(0, 10), locale: "pt-BR", origin: "https://bee-link.test" }

const home: AffiliateHome = {
  store: { slug: "loja", name: "Loja", logoUrl: null },
  affiliate: { id: "a1", name: "Maria", slug: "maria", status: "ACTIVE", table: { name: "Padrão", defaultRateBps: 1000 } },
  linksCredit: true,
  linkPath: "/loja/maria",
  pendingCents: 21_000,
  availableCents: 3000,
  payment: { availableCents: 3000, next: { dueOn: "2026-11-30", amountCents: 12_000 } },
  numbers: { days: 30, visits: 48, orders: 6, sales: 4, commissionCents: 24_000 },
  profile: { pixKey: null, phone: null, maskedCpf: null, photoUrl: null, tagline: null },
}

describe("the affiliate's area in words (IMPULSEIA-108)", () => {
  it("addresses a shop's page and its sections", () => {
    expect(affiliateShopHrefOf("loja da ana")).toBe("/afiliado/loja%20da%20ana")
    expect(affiliateShopHrefOf("loja", "orders")).toBe("/afiliado/loja?aba=vendas")
    expect(affiliateShopHrefOf("loja", "statement")).toBe("/afiliado/loja?aba=extrato")
    expect(affiliateShopHrefOf("loja", "home")).toBe("/afiliado/loja")
  })

  it("reads the section from the address's word, the payout e-mail's included, else the front page", () => {
    expect(areaTabOf("extrato")).toBe("statement")
    expect(areaTabOf("dados")).toBe("profile")
    expect(areaTabOf("statement")).toBe("home")
    expect(areaTabOf(undefined)).toBe("home")
  })

  it("says a shop's balance, below zero with its sign", () => {
    const card = shopCardOf({ store: { slug: "loja", name: "Loja", logoUrl: null }, slug: "maria", status: "ENDED", availableCents: -500, pendingCents: 0 }, money)
    expect(card).toMatchObject({ href: "/afiliado/loja", available: "−R$ 5,00", negative: true })
  })

  it("puts the site's origin before the link, and says the next payment and the table", () => {
    const view = homeViewOf(home, words, text.home)
    expect(view.link).toBe("https://bee-link.test/loja/maria")
    expect(view.next).toBe("dia 30 · R$ 120,00")
    expect(view.table).toBe("Tabela Padrão · 10% por venda")
    expect(view.notice).toBeNull()
    expect(view.numbers.title).toBe("Últimos 30 dias")
  })

  it("says why the link credits nobody: paused, ended, or the programme off", () => {
    expect(homeViewOf({ ...home, affiliate: { ...home.affiliate, status: "PAUSED" }, linksCredit: false }, words, text.home).notice).toBe(text.home.paused)
    expect(homeViewOf({ ...home, affiliate: { ...home.affiliate, status: "ENDED" }, linkPath: null }, words, text.home)).toMatchObject({ notice: text.home.ended, link: null })
    expect(homeViewOf({ ...home, linksCredit: false }, words, text.home).notice).toBe(text.home.notCrediting)
  })

  it("says what a product pays and its whole link", () => {
    const view = productLinkViewOf({ productId: "p1", name: "Bolsa", imageUrl: null, priceCents: 12_000, rateBps: 1500, path: "/loja/produtos/bolsa?afiliado=maria" }, words, text.products)
    expect(view).toEqual({ id: "p1", name: "Bolsa", imageUrl: null, price: "R$ 120,00", rate: "Você ganha 15%", url: "https://bee-link.test/loja/produtos/bolsa?afiliado=maria" })
  })

  it("says where an order's commission stands", () => {
    const order: AffiliateOrder = {
      number: 12,
      placedAt: "2026-11-11T12:00:00.000Z",
      status: "RECEIVED",
      customerName: "Bia",
      items: [{ name: "Whey", variantLabel: "Baunilha", quantity: 2 }],
      commission: { status: "PENDING", baseCents: 10_000, commissionCents: 1000, zeroReason: null, dueOn: null },
    }
    const statuses = defaultMessages.orders.statuses
    expect(orderViewOf(order, words, text.orders, statuses)).toMatchObject({ number: "Pedido #12", items: ["2× Whey (Baunilha)"], state: "Aguardando a entrega", void: false })
    expect(orderViewOf({ ...order, commission: { ...order.commission, dueOn: "2026-11-30" } }, words, text.orders, statuses).state).toBe("Vence em dia 30")
    expect(orderViewOf({ ...order, commission: { ...order.commission, status: "REVERSED" } }, words, text.orders, statuses)).toMatchObject({ state: "Estornada", void: true })
    expect(orderViewOf({ ...order, commission: { ...order.commission, commissionCents: 0, zeroReason: "OWN_PURCHASE" } }, words, text.orders, statuses).state).toBe(text.orders.ownPurchase)
  })

  it("sends only what changed, an emptied field as null", () => {
    const saved = profileFormOf({ pixKey: "maria@pix.test", phone: "5511988887777", maskedCpf: "***.982.247-**", photoUrl: null, tagline: "Oi" })
    expect(saved.phone).toBe("(11) 98888-7777")

    expect(profilePatchOf(saved, { ...saved, tagline: "  " })).toEqual({ tagline: null })
    expect(profilePatchOf(saved, { ...saved, pixKey: "529.982.247-25 " })).toEqual({ pixKey: "529.982.247-25" })
    expect(profilePatchOf(saved, saved)).toEqual({})
  })
})
