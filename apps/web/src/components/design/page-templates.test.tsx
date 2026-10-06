// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { PublicStore, StorePage } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { ptBR as web } from "@/locales/pt-BR"
import { useDesignPages } from "@/stores/design-pages"
import { PageTemplates } from "./page-templates"

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }), useSearchParams: () => new URLSearchParams() }))
// next/font runs only in Next's compiler; the preview needs the class and the variable, not the font.
vi.mock("@/components/storefront/shop-font", () => ({ figtree: { variable: "font-figtree" }, shopFontStyle: {} }))
// The shop's header and footer are the storefront's own, tested there; here they would only need a whole shop.
vi.mock("@/components/storefront/storefront-frame", () => ({ StorefrontFrame: ({ blocks }: { blocks: ReactNode }) => <div data-testid="whole-page">{blocks}</div> }))

const store = {
  slug: "loja",
  type: "ECOMMERCE",
  routeWords: { products: "produtos", categories: "categorias", search: "busca", cart: "carrinho", signIn: "entrar", verifyEmail: "confirmar-email", resetPassword: "nova-senha", account: "conta", accountTabs: { orders: "pedidos", favorites: "favoritos", reviews: "avaliacoes", cashback: "cashback", profile: "perfil", messages: "conversas" } },
  layoutSettings: {},
  sections: [],
} as unknown as PublicStore
const colors = { background: "oklch(0.98 0 0)", primary: "oklch(0.5 0.2 150)", header: "oklch(0.3 0 0)", footer: "oklch(0.2 0 0)" } as PublicStore["colors"]

const HOME = { id: "home-1", kind: "HOME", slug: null, title: "Página inicial", usesChrome: true, inMenu: false, status: "PUBLISHED" } as unknown as StorePage
const LANDING = { ...HOME, id: "lp-1", kind: "LANDING", slug: "campanha", title: "Campanha" } as unknown as StorePage

const model = (id: string, over: object = {}) => ({ id, pageKinds: ["HOME"], storeTypes: ["ECOMMERCE"], recommended: false, needs: [], ...over })
const HOME_MODELS = [model("ofertas", { recommended: true }), model("vitrine-com-capa"), model("catalogo-enxuto")]
const LANDING_MODELS = [model("lancamento", { needs: ["PRODUCT"] }), model("em-branco")]

/** A page of one heading that says which model it is, as the API would answer a preview. */
const pageOf = (templateId: string, product: string | null) => ({
  page: HOME,
  sections: [
    {
      id: `s-${templateId}`,
      name: null,
      width: "CONTAINED",
      background: null,
      components: [{ id: `c-${templateId}`, kind: "HEADING", title: `Modelo ${templateId}${product ? ` com ${product}` : ""}`, subtitle: null, body: null, span: "FULL", display: null, source: null, sourceCategory: null, items: [], columns: null, align: null, visibleOn: "ALL" }],
    },
  ],
})

interface Answers {
  models?: object[] | "fail"
  /** Models whose preview is refused, by the code the API answers. */
  refused?: Record<string, string>
}

/** Every call the gallery makes, answered as the API would, and remembered by its path. */
function stubApi({ models = HOME_MODELS, refused = {} }: Answers = {}): string[] {
  const calls: string[] = []
  vi.stubGlobal("fetch", (path: string) => {
    const url = new URL(path, "http://localhost")
    // The draft's read is the editor's own, shared with the bar: answered, and not counted as the gallery's.
    if (url.pathname.endsWith("/draft")) return Promise.resolve(new Response(JSON.stringify({ page: HOME, revision: 1, hasUnpublishedChanges: false, published: null, sections: [] })))
    calls.push(path)
    const preview = /page-templates\/([^/]+)\/preview/.exec(url.pathname)

    if (preview) {
      const code = refused[preview[1]!]
      return Promise.resolve(
        code
          ? new Response(JSON.stringify({ statusCode: 400, errorCode: code, message: "No" }), { status: 400 })
          : new Response(JSON.stringify(pageOf(preview[1]!, url.searchParams.get("productId")))),
      )
    }
    if (url.pathname.endsWith("/page-templates")) {
      return Promise.resolve(models === "fail" ? new Response("{}", { status: 500 }) : new Response(JSON.stringify(models)))
    }
    if (url.pathname.endsWith("/products")) {
      return Promise.resolve(new Response(JSON.stringify({ products: [{ id: "p1", name: "Whey Baunilha" }], total: 1, page: 1, pageSize: 96 })))
    }
    return Promise.resolve(new Response("{}", { status: 404 }))
  })
  return calls
}

function gallery(page: StorePage = HOME) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <PageTemplates
        store={store}
        categories={[]}
        colors={colors}
        year={2026}
        page={page}
        draft={{ publish: (then) => then?.(), saving: false }}
        messages={ptBR}
        web={web}
      />
    </QueryClientProvider>,
  )
}

const open = () => act(() => useDesignPages.getState().openTemplates())
const previewsAsked = (calls: string[]) => calls.filter((call) => call.includes("/preview"))
const card = (name: string) => screen.getAllByRole("listitem").find((item) => within(item).queryByRole("heading", { name }))!

// Every card on screen: where the browser cannot watch, a card counts as seen. Which cards are
// watched is the block's test (`template-gallery.test.tsx`).
beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", undefined)
})

afterEach(() => {
  vi.unstubAllGlobals()
  act(() => useDesignPages.getState().close())
})

describe("PageTemplates", () => {
  it("asks for nothing until it is opened", () => {
    const calls = stubApi()
    gallery()

    expect(calls).toEqual([])
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("lists the models of the page being edited and draws each one's preview with the shop's renderer", async () => {
    const calls = stubApi()
    gallery()
    open()

    expect(await screen.findByRole("heading", { name: "Vitrine com capa" })).toBeInTheDocument()
    expect(calls[0]).toBe("/api/stores/loja/page-templates?pageId=home-1")
    expect(within(card("Ofertas")).getByText("Indicado")).toBeInTheDocument()

    // The preview's own heading is drawn (inert, so found by its text and not by its role).
    expect(await screen.findByText("Modelo ofertas")).toBeInTheDocument()
    expect(await screen.findByText("Modelo catalogo-enxuto")).toBeInTheDocument()
    expect(previewsAsked(calls).sort()).toEqual([
      "/api/stores/loja/page-templates/catalogo-enxuto/preview?pageId=home-1",
      "/api/stores/loja/page-templates/ofertas/preview?pageId=home-1",
      "/api/stores/loja/page-templates/vitrine-com-capa/preview?pageId=home-1",
    ])
    // A home's models ask for no product: no search is offered, and no product is read.
    expect(screen.queryByLabelText("Produto dos modelos")).not.toBeInTheDocument()
    expect(calls.some((call) => call.includes("/products"))).toBe(false)
  })

  it("shows the chosen model as the whole page, from the request its card already made, and applies nothing by it", async () => {
    const calls = stubApi()
    gallery()
    open()
    await screen.findByText("Modelo ofertas")

    await userEvent.click(screen.getByRole("button", { name: "Ver o modelo Ofertas" }))

    const region = screen.getByRole("region", { name: "Prévia de Ofertas" })
    expect(within(within(region).getByTestId("whole-page")).getByText("Modelo ofertas")).toBeInTheDocument()
    expect(previewsAsked(calls).filter((call) => call.includes("/ofertas/"))).toHaveLength(1)
    // Choosing only shows: applying is its own button, and a question after it (`page-templates-apply.test.tsx`).
    expect(screen.getByRole("button", { name: "Usar este modelo" })).toBeEnabled()
    expect(calls.some((call) => call.includes("apply-template"))).toBe(false)
  })

  it("holds a product model's preview until a product is chosen, then draws it around that product", async () => {
    const calls = stubApi({ models: LANDING_MODELS })
    gallery(LANDING)
    open()

    expect(await within(await waitFor(() => card("Lançamento de produto"))).findByText("Escolha um produto para ver a prévia.")).toBeInTheDocument()
    await screen.findByText("Modelo em-branco")
    expect(previewsAsked(calls)).toEqual(["/api/stores/loja/page-templates/em-branco/preview?pageId=lp-1"])

    await userEvent.click(await screen.findByRole("button", { name: "Whey Baunilha" }))

    expect(await screen.findByText("Modelo lancamento com p1")).toBeInTheDocument()
    expect(previewsAsked(calls)).toContain("/api/stores/loja/page-templates/lancamento/preview?pageId=lp-1&productId=p1")
    // Only what is for sale is offered to build a page around.
    expect(calls.find((call) => call.includes("/products"))).toContain("status=ACTIVE")
  })

  it("says in its own card why one preview failed, in the owner's words, and draws the others", async () => {
    stubApi({ refused: { ofertas: "PAGE_TEMPLATE_UNAVAILABLE" } })
    gallery()
    open()

    expect(await within(await waitFor(() => card("Ofertas"))).findByRole("alert")).toHaveTextContent("Esse modelo não está disponível para esta loja.")
    expect(await screen.findByText("Modelo vitrine-com-capa")).toBeInTheDocument()
    expect(within(card("Ofertas")).getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument()
  })

  it("says the models could not be read, and reads them again when asked", async () => {
    const calls = stubApi({ models: "fail" })
    gallery()
    open()

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar os modelos.")
    stubApi()
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))

    expect(await screen.findByRole("heading", { name: "Ofertas" })).toBeInTheDocument()
    expect(calls).toHaveLength(1)
  })

  it("forgets the model chosen when it is closed", async () => {
    stubApi()
    gallery()
    open()
    await userEvent.click(await screen.findByRole("button", { name: "Ver o modelo Ofertas" }))
    expect(screen.getByRole("region", { name: "Prévia de Ofertas" })).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Fechar" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    open()

    expect(await screen.findByRole("button", { name: "Ver o modelo Ofertas", pressed: false })).toBeInTheDocument()
    expect(screen.queryByRole("region")).not.toBeInTheDocument()
  })
})
