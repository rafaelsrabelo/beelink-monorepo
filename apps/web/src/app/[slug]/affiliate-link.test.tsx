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
  home: vi.fn(() => null),
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
vi.mock("@/lib/site-origin", () => ({ siteOrigin: async () => "https://beelink.biz" }))
// The front door itself is the home page's, tested there: here, only that it is the one drawn, and how.
vi.mock("@/components/storefront/storefront-home", () => ({ StorefrontHome: mocks.home }))
vi.mock("@/lib/storefront-data", async (original) => ({
  ...(await original<typeof import("@/lib/storefront-data")>()),
  shopAt: mocks.shopAt,
  navigationAt: mocks.navigationAt,
}))

import SectionPage, { generateMetadata } from "./[section]/page"

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

/** What the page drew: the element it returned, when it returned one rather than leaving. */
type Drawn = { type: unknown; props: { slug: string; store: ServedShop; arrivedBy: string | null } }

describe("a shop's address that is an affiliate's link (IMPULSEIA-105)", () => {
  it("draws the shop's front door at the link's own address, with the affiliate, and leads nowhere", async () => {
    mocks.affiliateLinkAt.mockResolvedValue({ affiliate: JOAO })

    const drawn = (await SectionPage(at("joao", { utm_source: "instagram" }))) as unknown as Drawn

    expect(drawn.type).toBe(mocks.home)
    expect(drawn.props).toMatchObject({ slug: "lessari", arrivedBy: "joao" })
    expect(mocks.redirect).not.toHaveBeenCalled()
    expect(mocks.affiliateLinkAt).toHaveBeenCalledWith("lessari", { slug: "joao" })
  })

  it("keeps the affiliate's own spelling of the name, whatever the address's case", async () => {
    mocks.affiliateLinkAt.mockResolvedValue({ affiliate: JOAO })

    const drawn = (await SectionPage(at("Joao"))) as unknown as Drawn

    expect(drawn.props.arrivedBy).toBe("joao")
  })

  it("draws the front door with nobody, and never nothing, for a link that credits nobody", async () => {
    mocks.affiliateLinkAt.mockResolvedValue({ affiliate: null })

    const drawn = (await SectionPage(at("joao"))) as unknown as Drawn

    expect(drawn.type).toBe(mocks.home)
    expect(drawn.props.arrivedBy).toBeNull()
    expect(mocks.notFound).not.toHaveBeenCalled()
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it("draws it in place at the shop's own domain too, where the proxy rewrote `/<name>` onto this page", async () => {
    mocks.shopAt.mockResolvedValue({ ...shop, ownDomain: true })
    mocks.affiliateLinkAt.mockResolvedValue({ affiliate: JOAO })

    const drawn = (await SectionPage(at("joao"))) as unknown as Drawn

    expect(drawn.props).toMatchObject({ arrivedBy: "joao", store: expect.objectContaining({ ownDomain: true }) })
    expect(mocks.redirect).not.toHaveBeenCalled()
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

describe("what an affiliate's link says of itself to a search engine", () => {
  it("is the shop's front door, pointing at the shop's own address and kept out of the index", async () => {
    mocks.affiliateLinkAt.mockResolvedValue({ affiliate: JOAO })

    const meta = await generateMetadata(at("joao"))

    expect(meta).toMatchObject({ title: "Lessari", alternates: { canonical: "/lessari" }, robots: { index: false, follow: true } })
  })

  it("points at the domain's root at the shop's own domain, and says the same for a link that credits nobody", async () => {
    mocks.shopAt.mockResolvedValue({ ...shop, ownDomain: true })
    mocks.affiliateLinkAt.mockResolvedValue({ affiliate: null })

    expect(await generateMetadata(at("joao"))).toMatchObject({ alternates: { canonical: "/" }, robots: { index: false, follow: true } })
  })

  it("says nothing for a segment that is nobody's link", async () => {
    mocks.affiliateLinkAt.mockResolvedValue(null)

    expect(await generateMetadata(at("qualquer-coisa"))).toEqual({})
  })
})
