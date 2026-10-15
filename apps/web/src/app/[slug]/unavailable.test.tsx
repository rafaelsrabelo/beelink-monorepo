// Libs
import { render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// App
import fixtures from "@/lib/shop-share.fixtures.json"
import type { ServedShop } from "@/lib/storefront-data"
import { messagesFor } from "@/locales"

const mocks = vi.hoisted(() => ({ shopAt: vi.fn(), navigationAt: vi.fn(), productAt: vi.fn(), landingAt: vi.fn(), catalogueAt: vi.fn(), paymentOptionsAt: vi.fn() }))

vi.mock("server-only", () => ({}))
// next/font runs only in Next's compiler, and the pages draw a frame that asks for the shop's face.
vi.mock("@/components/storefront/shop-font", () => ({ figtree: { variable: "font-figtree", style: {} }, shopFontStyle: {} }))
vi.mock("@/lib/site-origin", () => ({ siteOrigin: async () => "https://beelink.biz" }))
vi.mock("@/lib/locale", () => ({ getMessages: async () => ({ ...messagesFor("pt-BR"), locale: "pt-BR" }) }))
vi.mock("@/lib/shopper", () => ({ shopperAt: async () => null }))
vi.mock("@/lib/storefront-data", async (original) => ({
  ...(await original<typeof import("@/lib/storefront-data")>()),
  shopAt: mocks.shopAt,
  navigationAt: mocks.navigationAt,
  productAt: mocks.productAt,
  landingAt: mocks.landingAt,
  catalogueAt: mocks.catalogueAt,
  paymentOptionsAt: mocks.paymentOptionsAt,
}))

import ProductPage, { generateMetadata as itemMetadata } from "./[section]/[item]/page"
import SectionPage, { generateMetadata as sectionMetadata } from "./[section]/page"
import LandingPage, { generateMetadata as landingMetadata } from "./lp/[page]/page"
import HomePage, { generateMetadata as homeMetadata } from "./page"

/** A shop whose page stopped paying (BEELINK-223), as the API answers its public read. */
const offTheAir = {
  slug: "loja-amora",
  name: "Loja Amora",
  type: "ECOMMERCE",
  description: "Bolsas de crochê feitas à mão.",
  logoUrl: null,
  bannerImageUrl: null,
  colors: fixtures.colors,
  layoutSettings: {},
  socialNetworks: { whatsapp: null, instagram: null, tiktok: null, spotify: null, youtube: null },
  paymentMethods: ["PIX"],
  cashback: null,
  metaPixelId: null,
  googleAnalyticsId: null,
  customDomain: null,
  sections: [],
  pages: [],
  routeWords: { products: "produtos", categories: "categorias", search: "busca", cart: "carrinho", signIn: "entrar", verifyEmail: "confirmar-email", resetPassword: "nova-senha", account: "conta", accountTabs: { orders: "pedidos", favorites: "favoritos", reviews: "avaliacoes", cashback: "cashback", profile: "perfil", messages: "conversas" } },
  unavailable: true,
  ownDomain: false,
} as unknown as ServedShop

const at = <Params extends object>(params: Params, query: Record<string, string | string[]> = {}) => ({ params: Promise.resolve(params), searchParams: Promise.resolve(query) })
const NOINDEX = { title: "Loja Amora", robots: { index: false, follow: false } }

beforeEach(() => {
  mocks.shopAt.mockResolvedValue(offTheAir)
  mocks.navigationAt.mockResolvedValue({ categories: [], onSale: false })
})

afterEach(() => {
  vi.clearAllMocks()
})

/** The notice, and that none of the catalogue was asked for. */
function expectTheNotice() {
  expect(screen.getByRole("heading", { level: 1, name: "Loja Amora" })).toBeInTheDocument()
  expect(screen.getByText("Loja indisponível no momento")).toBeInTheDocument()
  expect(screen.getByRole("link", { name: "Já comprou aqui? Veja seus pedidos" })).toHaveAttribute("href", "/loja-amora/conta/pedidos")
  expect(screen.queryByRole("searchbox")).not.toBeInTheDocument()
  for (const read of [mocks.navigationAt, mocks.productAt, mocks.catalogueAt, mocks.paymentOptionsAt]) expect(read).not.toHaveBeenCalled()
}

describe("a shop window off the air (BEELINK-223)", () => {
  it("draws the notice in place of the front door", async () => {
    render(await HomePage(at({ slug: "loja-amora" })))

    expectTheNotice()
  })

  it.each([["produtos"], ["busca"], ["carrinho"], ["categorias"], ["bolsas"]])("draws it at /%s too — every address that sells, a category's among them", async (section) => {
    render(await SectionPage(at({ slug: "loja-amora", section })))

    expectTheNotice()
  })

  it("draws it in place of a product's page, which it never asks for", async () => {
    render(await ProductPage(at({ slug: "loja-amora", section: "produtos", item: "bolsa" })))

    expectTheNotice()
  })

  it("draws it in place of a landing", async () => {
    mocks.landingAt.mockResolvedValue(null)

    render(await LandingPage(at({ slug: "loja-amora", page: "dia-das-maes" })))

    expectTheNotice()
  })

  it("says a site is a site, and offers it, which takes no orders, no way to any", async () => {
    mocks.shopAt.mockResolvedValue({ ...offTheAir, type: "INSTITUTIONAL" })

    render(await HomePage(at({ slug: "loja-amora" })))

    expect(screen.getByText("Site indisponível no momento")).toBeInTheDocument()
    expect(screen.getByText("Este site está fora do ar agora. Volte mais tarde.")).toBeInTheDocument()
    expect(screen.queryByText("Loja indisponível no momento")).not.toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("leads to a customer's orders at the address they came by, the shop's own domain included", async () => {
    mocks.shopAt.mockResolvedValue({ ...offTheAir, ownDomain: true })

    render(await HomePage(at({ slug: "loja-amora" })))

    expect(screen.getByRole("link", { name: "Já comprou aqui? Veja seus pedidos" })).toHaveAttribute("href", "/conta/pedidos")
  })

  it("is nobody's search result, wherever it stands in", async () => {
    mocks.landingAt.mockResolvedValue(null)

    expect(await homeMetadata(at({ slug: "loja-amora" }))).toEqual(NOINDEX)
    expect(await sectionMetadata(at({ slug: "loja-amora", section: "produtos" }))).toEqual(NOINDEX)
    expect(await itemMetadata(at({ slug: "loja-amora", section: "produtos", item: "bolsa" }))).toEqual(NOINDEX)
    expect(await landingMetadata(at({ slug: "loja-amora", page: "dia-das-maes" }))).toEqual(NOINDEX)
  })

  it("leaves a customer's own pages to answer as ever: the sign-in, the account and its tabs", async () => {
    expect(await sectionMetadata(at({ slug: "loja-amora", section: "entrar" }))).not.toEqual(NOINDEX)
    expect(await sectionMetadata(at({ slug: "loja-amora", section: "conta" }))).not.toEqual(NOINDEX)
    expect(await itemMetadata(at({ slug: "loja-amora", section: "conta", item: "pedidos" }))).not.toEqual(NOINDEX)
  })

  it("sends a visitor at the account to sign in, as ever, and draws no notice there", async () => {
    // Nobody is signed in here: the account's own page sends to its sign-in, which is how a customer reaches their orders.
    await expect(SectionPage(at({ slug: "loja-amora", section: "conta" }))).rejects.toThrow("NEXT_REDIRECT")
  })
})
