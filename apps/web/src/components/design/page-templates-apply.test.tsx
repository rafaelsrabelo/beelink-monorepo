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
import { useDraftRevision } from "@/stores/draft-revision"
import { PageTemplates } from "./page-templates"

const navigation = vi.hoisted(() => ({ refresh: vi.fn(), search: "" }))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: navigation.refresh }),
  useSearchParams: () => new URLSearchParams(navigation.search),
}))
vi.mock("@/components/storefront/shop-font", () => ({ figtree: { variable: "font-figtree" }, shopFontStyle: {} }))
vi.mock("@/components/storefront/storefront-frame", () => ({ StorefrontFrame: ({ blocks }: { blocks: ReactNode }) => <div>{blocks}</div> }))

const store = { slug: "loja", type: "ECOMMERCE", routeWords: {}, layoutSettings: {}, sections: [] } as unknown as PublicStore
const colors = { background: "oklch(0.98 0 0)", primary: "oklch(0.5 0.2 150)", header: "oklch(0.3 0 0)", footer: "oklch(0.2 0 0)" } as PublicStore["colors"]
const HOME = { id: "home-1", kind: "HOME", slug: null, title: "Página inicial", usesChrome: true, inMenu: false, status: "PUBLISHED" } as unknown as StorePage
const LANDING = { ...HOME, id: "lp-1", kind: "LANDING", slug: "campanha", title: "Campanha" } as unknown as StorePage

const model = (id: string, needs: string[] = []) => ({ id, pageKinds: ["HOME"], storeTypes: ["ECOMMERCE"], recommended: false, needs })
const HOME_MODELS = [model("ofertas"), model("vitrine-com-capa")]
const LANDING_MODELS = [model("lancamento", ["PRODUCT"]), model("em-branco")]

interface Answers {
  models?: object[]
  /** Whether the page's draft differs from what the shop serves. */
  unpublished?: boolean
  /** What applying answers: the draft it left, or the API's refusal. */
  apply?: { status: number; errorCode?: string }
}

interface Call {
  method: string
  path: string
  body: unknown
  revision: string | undefined
}

/** The gallery's calls answered as the API would, each remembered with what it sent. */
function stubApi({ models = HOME_MODELS, unpublished = false, apply = { status: 200 } }: Answers = {}): Call[] {
  const calls: Call[] = []
  vi.stubGlobal("fetch", (path: string, init?: RequestInit) => {
    const url = new URL(path, "http://localhost")
    const headers = (init?.headers ?? {}) as Record<string, string>
    calls.push({ method: init?.method ?? "GET", path, body: init?.body ? JSON.parse(String(init.body)) : null, revision: headers["x-page-revision"] })

    if (url.pathname.endsWith("/apply-template")) {
      return Promise.resolve(
        apply.status === 200
          ? new Response(JSON.stringify({ page: HOME, revision: 4, hasUnpublishedChanges: true, published: null, sections: [] }))
          : new Response(JSON.stringify({ statusCode: apply.status, errorCode: apply.errorCode, message: "No" }), { status: apply.status }),
      )
    }
    if (url.pathname.endsWith("/draft")) {
      return Promise.resolve(new Response(JSON.stringify({ page: HOME, revision: 3, hasUnpublishedChanges: unpublished, published: null, sections: [] })))
    }
    if (url.pathname.endsWith("/preview")) return Promise.resolve(new Response(JSON.stringify({ page: HOME, sections: [] })))
    if (url.pathname.endsWith("/page-templates")) return Promise.resolve(new Response(JSON.stringify(models)))
    if (url.pathname.endsWith("/products")) {
      return Promise.resolve(new Response(JSON.stringify({ products: [{ id: "p1", name: "Whey Baunilha" }], total: 1, page: 1, pageSize: 96 })))
    }
    return Promise.resolve(new Response("[]"))
  })
  return calls
}

function gallery(page: StorePage = HOME, draft = { publish: (then?: () => void) => then?.(), saving: false }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <PageTemplates store={store} categories={[]} colors={colors} year={2026} page={page} draft={draft} messages={ptBR} web={web} />
    </QueryClientProvider>,
  )
}

const open = () => act(() => useDesignPages.getState().openTemplates())
const applied = (calls: Call[]) => calls.filter((call) => call.path.includes("/apply-template"))

/** The model chosen and "Usar este modelo" pressed: the question is on screen. */
async function askFor(name: string) {
  await userEvent.click(await screen.findByRole("button", { name: `Ver o modelo ${name}` }))
  await userEvent.click(screen.getByRole("button", { name: "Usar este modelo" }))
  return screen.findByRole("alertdialog", { name: `Usar o modelo ${name}?` })
}

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", undefined)
  navigation.search = ""
  window.history.replaceState(null, "", "/admin/loja/design")
})

afterEach(() => {
  vi.unstubAllGlobals()
  navigation.refresh.mockClear()
  act(() => {
    useDesignPages.getState().close()
    useDesignPages.getState().dismissApplied()
    useDraftRevision.setState({ editing: {}, revisions: {}, sending: {}, stale: false })
  })
})

describe("PageTemplates — applying a model", () => {
  it("asks before it writes, and writes nothing when the answer is no", async () => {
    const calls = stubApi()
    gallery()
    open()

    const question = await askFor("Ofertas")
    expect(question).toHaveTextContent("Tudo o que está no rascunho de Página inicial será substituído por este modelo.")
    expect(question).toHaveTextContent("A loja publicada continua igual até você publicar.")
    expect(applied(calls)).toEqual([])

    await userEvent.click(within(question).getByRole("button", { name: "Cancelar" }))

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument())
    expect(applied(calls)).toEqual([])
    // The gallery and the choice are still there.
    expect(screen.getByRole("region", { name: "Prévia de Ofertas" })).toBeInTheDocument()
  })

  it("says the unpublished changes are lost only when the draft has some", async () => {
    stubApi({ unpublished: false })
    gallery()
    open()

    const question = await askFor("Ofertas")
    // Once the draft's read has answered: nothing unpublished to lose.
    await waitFor(() => expect(question).not.toHaveTextContent("serão perdidas"))
  })

  it("warns of the unpublished changes when the draft has them", async () => {
    stubApi({ unpublished: true })
    gallery()
    open()

    expect(await askFor("Ofertas")).toHaveTextContent("As alterações que você ainda não publicou nesta página serão perdidas.")
  })

  it("writes the model over the open page's draft, closes the gallery and leaves the news for the editor", async () => {
    const calls = stubApi()
    act(() => {
      useDraftRevision.getState().open("loja", "home-1")
      useDraftRevision.getState().saw("home-1", 3)
    })
    gallery()
    open()

    await userEvent.click(within(await askFor("Ofertas")).getByRole("button", { name: "Usar modelo" }))

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(applied(calls)).toEqual([{ method: "POST", path: "/api/stores/loja/pages/home-1/apply-template", body: { template: "ofertas" }, revision: "3" }])
    expect(useDesignPages.getState().applied).toEqual({ pageId: "home-1", templateId: "ofertas" })
    expect(useDesignPages.getState().dialog).toBeNull()
    expect(navigation.refresh).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })

  it("sends the editor's own saves first", async () => {
    const calls = stubApi()
    let release: () => void = () => undefined
    const publish = vi.fn((then?: () => void) => {
      release = () => then?.()
    })
    gallery(HOME, { publish, saving: true })
    open()

    await userEvent.click(within(await askFor("Ofertas")).getByRole("button", { name: "Usar modelo" }))

    expect(publish).toHaveBeenCalledTimes(1)
    expect(applied(calls)).toEqual([])
    expect(screen.getByRole("button", { name: "Aplicando…" })).toBeDisabled()

    act(() => release())
    await waitFor(() => expect(applied(calls)).toHaveLength(1))
  })

  it("does not apply a product model until its product is chosen, then sends the product with it", async () => {
    const calls = stubApi({ models: LANDING_MODELS })
    gallery(LANDING)
    open()

    await userEvent.click(await screen.findByRole("button", { name: "Ver o modelo Lançamento de produto" }))
    expect(screen.getByRole("button", { name: "Usar este modelo" })).toBeDisabled()
    expect(screen.getByText("Escolha um produto para usar este modelo.")).toBeInTheDocument()

    await userEvent.click(await screen.findByRole("button", { name: "Whey Baunilha" }))
    await userEvent.click(screen.getByRole("button", { name: "Usar este modelo" }))
    const question = await screen.findByRole("alertdialog")
    expect(question).toHaveTextContent("Tudo o que está no rascunho de Campanha será substituído por este modelo.")
    await userEvent.click(within(question).getByRole("button", { name: "Usar modelo" }))

    await waitFor(() => expect(applied(calls)).toHaveLength(1))
    expect(applied(calls)[0]).toMatchObject({ path: "/api/stores/loja/pages/lp-1/apply-template", body: { template: "lancamento", productId: "p1" } })
  })

  it.each([
    ["PAGE_TEMPLATE_UNAVAILABLE", "Esse modelo não está disponível para esta loja."],
    ["PAGE_PRODUCT_REQUIRED", "Escolha o produto principal da página."],
    ["PAGE_PRODUCT_INVALID", "Esse produto não é desta loja. Escolha outro."],
    ["PAGE_NOT_FOUND", "Essa página não existe mais. Abra a lista de páginas de novo."],
    ["SOMETHING_NEW", web.errors.UNKNOWN],
  ])("says a refusal (%s) in the owner's words, inside the question, and keeps the gallery", async (errorCode, sentence) => {
    stubApi({ apply: { status: 400, errorCode } })
    gallery()
    open()

    const question = await askFor("Ofertas")
    await userEvent.click(within(question).getByRole("button", { name: "Usar modelo" }))

    expect(await within(question).findByRole("alert")).toHaveTextContent(sentence)
    expect(within(question).getByRole("button", { name: "Usar modelo" })).toBeEnabled()
    expect(useDesignPages.getState().applied).toBeNull()
    expect(useDraftRevision.getState().stale).toBe(false)
    expect(navigation.refresh).not.toHaveBeenCalled()
  })

  it("hands a stale draft to the editor's conflict dialog and keeps the choice in the address for the reload", async () => {
    stubApi({ models: LANDING_MODELS, apply: { status: 409, errorCode: "PAGE_DRAFT_STALE" } })
    window.history.replaceState(null, "", "/admin/loja/design?page=lp-1")
    gallery(LANDING)
    open()

    await userEvent.click(await screen.findByRole("button", { name: "Ver o modelo Lançamento de produto" }))
    await userEvent.click(await screen.findByRole("button", { name: "Whey Baunilha" }))
    await userEvent.click(screen.getByRole("button", { name: "Usar este modelo" }))
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Usar modelo" }))

    // `stale` is what opens the conflict dialog (`draft-conflict.tsx`), whose one button reloads.
    await waitFor(() => expect(useDraftRevision.getState().stale).toBe(true))
    expect(window.location.search).toBe("?page=lp-1&templates=1&template=lancamento&product=p1")
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument())
    expect(useDesignPages.getState().applied).toBeNull()
    expect(useDesignPages.getState().dialog).toEqual({ kind: "templates" })
  })
})

describe("PageTemplates — asked for in the address", () => {
  it("opens on the model and the product the address names, and takes them out of the address", async () => {
    const calls = stubApi({ models: LANDING_MODELS })
    navigation.search = "page=lp-1&templates=1&template=lancamento&product=p1"
    window.history.replaceState(null, "", `/admin/loja/design?${navigation.search}`)
    gallery(LANDING)

    expect(await screen.findByRole("button", { name: "Ver o modelo Lançamento de produto", pressed: true })).toBeInTheDocument()
    expect(window.location.search).toBe("?page=lp-1")
    await waitFor(() => expect(calls.some((call) => call.path.includes("/lancamento/preview?pageId=lp-1&productId=p1"))).toBe(true))
    // Applying still asks: the draft is the one the other tab left.
    await userEvent.click(screen.getByRole("button", { name: "Usar este modelo" }))
    expect(await screen.findByRole("alertdialog", { name: "Usar o modelo Lançamento de produto?" })).toBeInTheDocument()
    expect(applied(calls)).toEqual([])
  })

  it("opens with nothing chosen when the address only asks for the gallery", async () => {
    stubApi()
    navigation.search = "templates=1"
    window.history.replaceState(null, "", "/admin/loja/design?templates=1")
    gallery()

    expect(await screen.findByRole("button", { name: "Ver o modelo Ofertas", pressed: false })).toBeInTheDocument()
    expect(window.location.search).toBe("")
  })

  it("stays closed in an address that does not ask", () => {
    stubApi()
    navigation.search = "page=lp-1"
    gallery(LANDING)

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})
