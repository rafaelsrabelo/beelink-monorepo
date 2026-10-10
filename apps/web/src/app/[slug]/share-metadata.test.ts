// Node
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

// Libs
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { Metadata } from "next"
import type { PublicLanding, PublicProductCategory, PublicProductDetail } from "@harness-monorepo/contracts"

// App
import fixtures from "@/lib/shop-share.fixtures.json"
import type { ServedShop } from "@/lib/storefront-data"
import { messagesFor } from "@/locales"

const mocks = vi.hoisted(() => ({ shopAt: vi.fn(), navigationAt: vi.fn(), productAt: vi.fn(), landingAt: vi.fn(), origin: { current: "" } }))

vi.mock("server-only", () => ({}))
// next/font runs only in Next's compiler, and the pages draw a frame that asks for the shop's face.
vi.mock("@/components/storefront/shop-font", () => ({ figtree: { variable: "font-figtree", style: {} }, shopFontStyle: {} }))
vi.mock("@/lib/site-origin", () => ({ siteOrigin: async () => mocks.origin.current }))
vi.mock("@/lib/locale", () => ({ getMessages: async () => ({ ...messagesFor("pt-BR"), locale: "pt-BR" }) }))
vi.mock("@/lib/storefront-data", async (original) => ({
  ...(await original<typeof import("@/lib/storefront-data")>()),
  shopAt: mocks.shopAt,
  navigationAt: mocks.navigationAt,
  productAt: mocks.productAt,
  landingAt: mocks.landingAt,
}))

import { generateMetadata as orderMetadata } from "./[section]/[item]/[sub]/page"
import { generateMetadata as itemMetadata } from "./[section]/[item]/page"
import { generateMetadata as sectionMetadata } from "./[section]/page"
import { generateMetadata as landingMetadata } from "./lp/[page]/page"
import { generateMetadata as homeMetadata } from "./page"

const CLOUD = "https://res.cloudinary.com/demo/image/upload"
const logo = `${CLOUD}/v1/bee-link/logo.png`
const SHOP_PICTURE = { url: `${CLOUD}/c_fit,w_560,h_400/c_lpad,w_1200,h_630,b_rgb:3b7af7/f_jpg/v1/bee-link/logo.png`, width: 1200, height: 630, alt: "Loja Amora", type: "image/jpeg" }

const store = {
  slug: "loja-amora",
  name: "Loja Amora",
  description: "Bolsas de crochê feitas à mão.",
  logoUrl: logo,
  bannerImageUrl: null,
  colors: fixtures.colors,
  routeWords: { products: "produtos", categories: "categorias", search: "busca", cart: "carrinho", signIn: "entrar", verifyEmail: "confirmar-email", resetPassword: "nova-senha", account: "conta", accountTabs: { orders: "pedidos", favorites: "favoritos", reviews: "avaliacoes", cashback: "cashback", profile: "perfil", messages: "conversas" } },
  ownDomain: false,
} as unknown as ServedShop

const product = {
  id: "p1",
  slug: "bolsa",
  name: "Bolsa Amora",
  description: "**Bolsa Amora**Feita à mão, em crochê.",
  images: [
    { id: "i1", url: `${CLOUD}/v7/bee-link/bolsa.png`, alt: null, optionValueIds: [] },
    { id: "i2", url: `${CLOUD}/v8/bee-link/bolsa-azul.png`, alt: null, optionValueIds: ["azul"] },
  ],
  category: null,
  options: [{ id: "cor", name: "Cor", values: [{ id: "azul", label: "Azul" }] }],
  variants: [{ id: "v-azul", optionValueIds: ["azul"], imageUrl: null }],
} as unknown as PublicProductDetail

const landing = { slug: "dia-das-maes", title: "Dia das Mães", usesChrome: true, seo: { title: null, description: null, imageUrl: null }, sections: [] } as unknown as PublicLanding

const whey = { id: "c1", slug: "whey", name: "Whey", description: null, imageUrl: null, parentSlug: null } as unknown as PublicProductCategory

type Card = { url?: string; siteName?: string; title?: string; description?: string; type?: string; images?: unknown }
const cardOf = (metadata: Metadata) => metadata.openGraph as Card

const at = <Params extends object>(params: Params, query: Record<string, string | string[]> = {}) => ({ params: Promise.resolve(params), searchParams: Promise.resolve(query) })

/** The same shop, as a request by its own domain is served it. */
function atItsDomain() {
  mocks.shopAt.mockResolvedValue({ ...store, ownDomain: true })
  mocks.origin.current = "https://lojaamora.com.br"
}

beforeEach(() => {
  mocks.origin.current = "https://beelink.biz"
  mocks.shopAt.mockResolvedValue(store)
  mocks.navigationAt.mockResolvedValue({ categories: [whey], onSale: false })
  mocks.productAt.mockResolvedValue(product)
  mocks.landingAt.mockResolvedValue(landing)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("what a link preview reads of a shop's front door", () => {
  it("is the shop's name, its words, its address in full and its logo on its colour", async () => {
    const metadata = await homeMetadata(at({ slug: "loja-amora" }))

    expect(cardOf(metadata)).toEqual({ type: "website", url: "https://beelink.biz/loja-amora", siteName: "Loja Amora", title: "Loja Amora", description: "Bolsas de crochê feitas à mão.", images: [SHOP_PICTURE] })
    expect(metadata.title).toBe("Loja Amora")
    expect(metadata.alternates).toEqual({ canonical: "/loja-amora" })
  })

  it("carries no slug at the shop's own domain", async () => {
    atItsDomain()

    expect(cardOf(await homeMetadata(at({ slug: "loja-amora" })))).toMatchObject({ url: "https://lojaamora.com.br/", siteName: "Loja Amora", images: [SHOP_PICTURE] })
  })

  it("shows the cover, cut to the frame, of a shop with no logo — and no picture of one with neither", async () => {
    mocks.shopAt.mockResolvedValue({ ...store, logoUrl: null, bannerImageUrl: `${CLOUD}/v2/bee-link/capa.png` })
    expect(cardOf(await homeMetadata(at({ slug: "loja-amora" }))).images).toEqual([{ ...SHOP_PICTURE, url: `${CLOUD}/c_fill,w_1200,h_630/f_jpg/v2/bee-link/capa.png` }])

    mocks.shopAt.mockResolvedValue({ ...store, logoUrl: null })
    expect(cardOf(await homeMetadata(at({ slug: "loja-amora" })))).not.toHaveProperty("images")
  })

  it("declares nothing for a slug no shop holds", async () => {
    mocks.shopAt.mockResolvedValue(null)

    expect(await homeMetadata(at({ slug: "nada" }))).toEqual({})
  })
})

describe("what a link preview reads of a shelf, the cart and the doors", () => {
  // They declared no card at all: a preview read the page's title, and showed no picture.
  it("is the page's own title, the shop's name beside it, and the shop's picture", async () => {
    const pages = [
      ["produtos", "Todos os produtos · Loja Amora", "/loja-amora/produtos"],
      ["whey", "Whey · Loja Amora", "/loja-amora/whey"],
      ["categorias", "Categorias · Loja Amora", "/loja-amora/categorias"],
      ["busca", "Busca · Loja Amora", "/loja-amora/busca"],
      ["carrinho", "Carrinho · Loja Amora", "/loja-amora/carrinho"],
      ["entrar", "Entrar · Loja Amora", "/loja-amora/entrar"],
    ] as const

    for (const [section, title, path] of pages) {
      const metadata = await sectionMetadata(at({ slug: "loja-amora", section }))

      expect(cardOf(metadata), section).toEqual({ type: "website", url: `https://beelink.biz${path}`, siteName: "Loja Amora", title, description: "Bolsas de crochê feitas à mão.", images: [SHOP_PICTURE] })
      expect(metadata.title, section).toBe(title)
    }
  })

  it("names the shelf's own address, whatever page or term it was reached with", async () => {
    const searched = await sectionMetadata(at({ slug: "loja-amora", section: "busca" }, { q: "bolsa", pagina: "3" }))

    expect(cardOf(searched).url).toBe("https://beelink.biz/loja-amora/busca")
    expect(searched.alternates).toEqual({ canonical: "/loja-amora/busca" })
    expect(searched.robots).toEqual({ index: false, follow: true })
  })

  it("carries no slug at the shop's own domain", async () => {
    atItsDomain()

    expect(cardOf(await sectionMetadata(at({ slug: "loja-amora", section: "whey" }))).url).toBe("https://lojaamora.com.br/whey")
    expect(cardOf(await sectionMetadata(at({ slug: "loja-amora", section: "produtos" }))).url).toBe("https://lojaamora.com.br/produtos")
  })

  it("declares nothing for a category the shop does not have", async () => {
    expect(await sectionMetadata(at({ slug: "loja-amora", section: "nao-existe" }))).toEqual({})
  })
})

describe("what a link preview reads of a product", () => {
  it("is the product's name and photo, as the photo came, under the shop's name", async () => {
    const metadata = await itemMetadata(at({ slug: "loja-amora", section: "produtos", item: "bolsa" }))

    expect(cardOf(metadata)).toEqual({
      type: "website",
      url: "https://beelink.biz/loja-amora/produtos/bolsa",
      siteName: "Loja Amora",
      title: "Bolsa Amora",
      description: "Bolsa Amora Feita à mão, em crochê.",
      images: [{ url: `${CLOUD}/v7/bee-link/bolsa.png` }],
    })
    expect(metadata.description).toBe("Bolsa Amora Feita à mão, em crochê.")
    expect(metadata.alternates).toEqual({ canonical: "/loja-amora/produtos/bolsa" })
  })

  // Meta's readers fetch the card from the address it names: without the combination, the first photo would be back.
  it("keeps the combination the address chose, in the card's address and in its photo, and out of the canonical", async () => {
    const metadata = await itemMetadata(at({ slug: "loja-amora", section: "produtos", item: "bolsa" }, { variant: "v-azul" }))

    expect(cardOf(metadata)).toMatchObject({ url: "https://beelink.biz/loja-amora/produtos/bolsa?variant=v-azul", images: [{ url: `${CLOUD}/v8/bee-link/bolsa-azul.png` }] })
    expect(metadata.alternates).toEqual({ canonical: "/loja-amora/produtos/bolsa" })
  })

  it("leaves out a combination the product does not have", async () => {
    const metadata = await itemMetadata(at({ slug: "loja-amora", section: "produtos", item: "bolsa" }, { variant: "de-outro-produto" }))

    expect(cardOf(metadata).url).toBe("https://beelink.biz/loja-amora/produtos/bolsa")
  })

  // It was the raw logo, in whatever shape the logo is.
  it("shows the shop's picture for a product with no photo", async () => {
    mocks.productAt.mockResolvedValue({ ...product, images: [] })

    expect(cardOf(await itemMetadata(at({ slug: "loja-amora", section: "produtos", item: "bolsa" }))).images).toEqual([SHOP_PICTURE])
  })

  it("carries no slug at the shop's own domain", async () => {
    atItsDomain()

    expect(cardOf(await itemMetadata(at({ slug: "loja-amora", section: "produtos", item: "bolsa" }))).url).toBe("https://lojaamora.com.br/produtos/bolsa")
  })
})

describe("what a link preview reads of a landing", () => {
  it("is the landing's own picture, as it came, when the shopkeeper chose one", async () => {
    mocks.landingAt.mockResolvedValue({ ...landing, seo: { title: "Presentes", description: "Para ela.", imageUrl: `${CLOUD}/v9/bee-link/maes.jpg` } })

    expect(cardOf(await landingMetadata(at({ slug: "loja-amora", page: "dia-das-maes" })))).toEqual({
      type: "website",
      url: "https://beelink.biz/loja-amora/lp/dia-das-maes",
      siteName: "Loja Amora",
      title: "Presentes",
      description: "Para ela.",
      images: [{ url: `${CLOUD}/v9/bee-link/maes.jpg` }],
    })
  })

  // It was the raw logo.
  it("is the shop's picture when it has none of its own", async () => {
    expect(cardOf(await landingMetadata(at({ slug: "loja-amora", page: "dia-das-maes" })))).toMatchObject({ title: "Dia das Mães · Loja Amora", images: [SHOP_PICTURE] })
  })

  it("carries no slug at the shop's own domain", async () => {
    atItsDomain()

    expect(cardOf(await landingMetadata(at({ slug: "loja-amora", page: "dia-das-maes" }))).url).toBe("https://lojaamora.com.br/lp/dia-das-maes")
  })
})

describe("what the shopper's own pages declare", () => {
  it("is the shop's name and picture on a tab of the account, still kept out of a search", async () => {
    const metadata = await itemMetadata(at({ slug: "loja-amora", section: "conta", item: "pedidos" }))

    expect(cardOf(metadata)).toMatchObject({ url: "https://beelink.biz/loja-amora/conta/pedidos", siteName: "Loja Amora", title: "Meus pedidos · Loja Amora", images: [SHOP_PICTURE] })
    expect(metadata.robots).toEqual({ index: false, follow: true })
  })

  it("is the shop's name and picture on one order, still kept out of a search", async () => {
    const metadata = await orderMetadata(at({ slug: "loja-amora", section: "conta", item: "pedidos", sub: "14" }))

    expect(cardOf(metadata)).toMatchObject({ url: "https://beelink.biz/loja-amora/conta/pedidos/14", siteName: "Loja Amora", title: "Pedido nº 14 · Loja Amora", images: [SHOP_PICTURE] })
    expect(metadata.robots).toEqual({ index: false, follow: false })
  })
})

/**
 * What no function can hold: that every page of a shop goes through the one builder. Next replaces a
 * card whole, key for key, so one written by hand is a page that lost the shop's name or its picture.
 */
describe("the cards of a shop's pages, in the app's tree", () => {
  const source = join(process.cwd(), "src")
  const read = (file: string) => readFileSync(join(source, file), "utf8")
  const under = (folder: string) => (readdirSync(join(source, folder), { recursive: true }) as string[]).map((file) => `${folder}/${file.replaceAll("\\", "/")}`).filter((file) => /\.tsx$/.test(file) && !/\.test\.tsx$/.test(file))
  const files = [...under("app/[slug]"), ...under("components/storefront/account")]
  const declaring = files.filter((file) => /\bopenGraph\s*:/.test(read(file)))

  it("is declared by the home, the sections, the products, the landings and the shopper's pages", () => {
    expect(declaring.sort()).toEqual([
      "app/[slug]/[section]/[item]/page.tsx",
      "app/[slug]/[section]/page.tsx",
      "app/[slug]/lp/[page]/page.tsx",
      "app/[slug]/page.tsx",
      "components/storefront/account/account-tab-page.tsx",
      "components/storefront/account/order-page.tsx",
    ])
  })

  it("is never written by hand", () => {
    for (const file of declaring) expect(read(file).match(/\bopenGraph\s*:(?!\s*shopShareOf\()/g), file).toBeNull()
  })

  // The card's address is the request's own until the web is told its address (BEELINK-247), and Next fills Twitter's from the card.
  it("sets no base for its addresses and no Twitter card of its own", () => {
    for (const file of files) expect(read(file), file).not.toMatch(/\bmetadataBase\b|\btwitter\s*:/)
  })

  // A viewport is merged by key: a page's own colour would replace the shop's on that page alone.
  it("has the browser's bar painted once, by the shop's layout, and by no page under it", () => {
    expect(read("app/[slug]/layout.tsx")).toContain("return shopThemeColorOf(await shopAt(slug))")
    for (const file of files.filter((entry) => entry !== "app/[slug]/layout.tsx")) expect(read(file), file).not.toMatch(/\bthemeColor\b|\bgenerateViewport\b/)
  })
})
