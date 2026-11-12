// Libs
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// App
import fixtures from "@/lib/shop-share.fixtures.json"
import type { ServedShop } from "@/lib/storefront-data"
import { messagesFor } from "@/locales"

const mocks = vi.hoisted(() => ({
  shopAt: vi.fn(),
  navigationAt: vi.fn(),
  affiliateLinkAt: vi.fn(),
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT ${to}`)
  }),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND")
  }),
}))

vi.mock("server-only", () => ({}))
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: mocks.notFound }))
vi.mock("@/components/storefront/shop-font", () => ({ figtree: { variable: "font-figtree", style: {} }, shopFontStyle: {} }))
vi.mock("@/lib/locale", () => ({ getMessages: async () => ({ ...messagesFor("pt-BR"), locale: "pt-BR" }) }))
vi.mock("@/lib/affiliate-link", () => ({ affiliateLinkAt: mocks.affiliateLinkAt }))
vi.mock("@/lib/storefront-data", async (original) => ({
  ...(await original<typeof import("@/lib/storefront-data")>()),
  shopAt: mocks.shopAt,
  navigationAt: mocks.navigationAt,
}))

import SectionPage from "./[section]/page"

const shop = {
  slug: "lessari",
  name: "Lessari",
  type: "ECOMMERCE",
  colors: fixtures.colors,
  layoutSettings: {},
  sections: [],
  pages: [],
  routeWords: { products: "produtos", categories: "categorias", search: "busca", cart: "carrinho", signIn: "entrar", verifyEmail: "confirmar-email", resetPassword: "nova-senha", account: "conta", accountTabs: { orders: "pedidos", favorites: "favoritos", reviews: "avaliacoes", cashback: "cashback", profile: "perfil", messages: "conversas" } },
  unavailable: false,
  ownDomain: false,
} as unknown as ServedShop

const JOAO = { id: "0199a1b2-0000-7000-8000-000000000001", slug: "joao", name: "João Silva", photoUrl: null, tagline: null, attributionDays: 30 }
const at = (section: string, query: Record<string, string | string[]> = {}) => ({ params: Promise.resolve({ slug: "lessari", section }), searchParams: Promise.resolve(query) })

beforeEach(() => {
  mocks.shopAt.mockResolvedValue(shop)
  mocks.navigationAt.mockResolvedValue({ categories: [{ slug: "bolsas", name: "Bolsas", parentSlug: null }], onSale: false })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("a shop's address that is an affiliate's link (IMPULSEIA-105)", () => {
  it("leads to the shop's front door with the affiliate, carrying what else the address said", async () => {
    mocks.affiliateLinkAt.mockResolvedValue({ affiliate: JOAO })

    await expect(SectionPage(at("joao", { utm_source: "instagram" }))).rejects.toThrow("REDIRECT /lessari?utm_source=instagram&afiliado=joao")
    expect(mocks.affiliateLinkAt).toHaveBeenCalledWith("lessari", { slug: "joao" })
  })

  it("leads to the shop alone, and never to nothing, for a link that credits nobody", async () => {
    mocks.affiliateLinkAt.mockResolvedValue({ affiliate: null })

    await expect(SectionPage(at("joao"))).rejects.toThrow("REDIRECT /lessari")
    expect(mocks.notFound).not.toHaveBeenCalled()
  })

  it("leads to the shop's own domain's root at its own domain", async () => {
    mocks.shopAt.mockResolvedValue({ ...shop, ownDomain: true })
    mocks.affiliateLinkAt.mockResolvedValue({ affiliate: JOAO })

    await expect(SectionPage(at("joao"))).rejects.toThrow("REDIRECT /?afiliado=joao")
  })

  it("is still a 404 for a segment that is nobody's link", async () => {
    mocks.affiliateLinkAt.mockResolvedValue(null)

    await expect(SectionPage(at("qualquer-coisa"))).rejects.toThrow("NOT_FOUND")
  })

  it("asks for no affiliate where the segment is a category", async () => {
    mocks.affiliateLinkAt.mockResolvedValue({ affiliate: JOAO })

    await SectionPage(at("bolsas")).catch(() => undefined)
    expect(mocks.affiliateLinkAt).not.toHaveBeenCalled()
  })
})
