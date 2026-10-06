// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { ptBR as web } from "@/locales/pt-BR"
import { useDesignPages } from "@/stores/design-pages"
import { landingOptionsOf, NewLanding } from "./new-landing"
import { PageSettings } from "./page-settings"

const refresh = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }))

const PAGE = {
  id: "p1",
  kind: "LANDING",
  slug: "ofertas",
  title: "Ofertas",
  usesChrome: true,
  inMenu: false,
  status: "DRAFT",
  seo: { title: "Velho", description: null, imageUrl: null },
  publishedAt: null,
  createdAt: "2026-09-26T00:00:00.000Z",
  updatedAt: "2026-09-26T00:00:00.000Z",
}

const model = (id: string, needs: string[] = [], over: object = {}) => ({ id, pageKinds: ["LANDING"], storeTypes: ["ECOMMERCE"], recommended: false, needs, ...over })
/** What the catalogue offers a shop's new landing, and a site's. */
const SHOP_MODELS = [model("lancamento", ["PRODUCT"]), model("promocao-relampago", ["PRODUCT"]), model("colecao", ["PRODUCT"]), model("em-branco")]
const SITE_MODELS = [model("em-branco")]

/**
 * Every call the dialogs make, answered as the API would, and remembered as "METHOD path body".
 * `models` is what the catalogue lists for a new landing: "fail" when it cannot be read.
 */
function stubApi(models: object[] | "fail" = SITE_MODELS): string[] {
  const calls: string[] = []
  vi.stubGlobal("fetch", (path: string, init?: RequestInit) => {
    calls.push(`${init?.method ?? "GET"} ${path} ${init?.body ?? ""}`)
    if (path.includes("/page-templates")) {
      return Promise.resolve(models === "fail" ? new Response("{}", { status: 500 }) : new Response(JSON.stringify(models)))
    }
    if (path.includes("/products")) {
      return Promise.resolve(new Response(JSON.stringify({ products: [{ id: "prod-1", name: "Whey Baunilha" }], total: 1, page: 1, pageSize: 96 })))
    }
    const body = path.includes("/availability")
      ? { slug: "ofertas-de-verao", available: true, reason: null }
      : init?.method === "POST" || init?.method === "PATCH"
        ? { ...PAGE, id: "p2" }
        : [PAGE]
    return Promise.resolve(new Response(JSON.stringify(body), { status: init?.method === "POST" ? 201 : 200 }))
  })
  return calls
}

const bodyOf = (call: string | undefined) => JSON.parse(call!.split(" ").slice(2).join(" ")) as Record<string, unknown>

function wrap(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

afterEach(() => {
  vi.unstubAllGlobals()
  refresh.mockReset()
  act(() => useDesignPages.getState().close())
})

describe("NewLanding", () => {
  it("makes a site's blank page from its name and opens it in the editor", async () => {
    const calls = stubApi()
    const go = vi.fn()
    render(wrap(<NewLanding slug="loja" site go={go} messages={ptBR} web={web} />))
    act(() => useDesignPages.getState().openNew())

    await userEvent.type(await screen.findByLabelText("Nome da página"), "Ofertas de verão")
    await waitFor(() => expect(screen.getByLabelText("Endereço")).toHaveAccessibleDescription("Disponível"))
    await userEvent.click(screen.getByRole("button", { name: "Criar página" }))

    await waitFor(() => expect(go).toHaveBeenCalledWith("/admin/loja/design?page=p2"))
    const post = calls.find((call) => call.startsWith("POST"))
    expect(post).toContain("/api/stores/loja/pages")
    // The address followed the name, so the API derives it; a site sells nothing, so no product is sent.
    expect(bodyOf(post)).toEqual({
      title: "Ofertas de verão",
      template: "em-branco",
      productId: null,
      inMenu: false,
      usesChrome: true,
    })
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})

describe("NewLanding — the templates, read from the catalogue", () => {
  it("asks for nothing until it is opened, then for the models of a new landing of this shop", async () => {
    const calls = stubApi(SHOP_MODELS)
    render(wrap(<NewLanding slug="loja" site={false} go={vi.fn()} messages={ptBR} web={web} />))
    expect(calls).toEqual([])

    act(() => useDesignPages.getState().openNew())

    await screen.findByRole("radio", { name: /Lançamento de produto/ })
    expect(calls.filter((call) => call.includes("/page-templates"))).toEqual(["GET /api/stores/loja/page-templates?kind=LANDING "])
  })

  it("draws the four a shop is offered, in the API's order, the first chosen", async () => {
    stubApi(SHOP_MODELS)
    render(wrap(<NewLanding slug="loja" site={false} go={vi.fn()} messages={ptBR} web={web} />))
    act(() => useDesignPages.getState().openNew())

    await screen.findByRole("radio", { name: /Lançamento de produto/ })
    expect(screen.getAllByRole("radio").map((radio) => radio.getAttribute("value"))).toEqual(["lancamento", "promocao-relampago", "colecao", "em-branco"])
    expect(screen.getByRole("radio", { name: /Lançamento de produto/ })).toBeChecked()
    expect(screen.getByLabelText("Produto principal")).toBeInTheDocument()
  })

  // Decision 3 of the epic: the shop's category orders the list, so the suggested one opens chosen.
  it("opens on the one the shop's category suggests, which the API lists first", async () => {
    stubApi([model("colecao", ["PRODUCT"], { recommended: true }), ...SHOP_MODELS.filter((entry) => entry.id !== "colecao")])
    render(wrap(<NewLanding slug="loja" site={false} go={vi.fn()} messages={ptBR} web={web} />))
    act(() => useDesignPages.getState().openNew())

    expect(await screen.findByRole("radio", { name: /Coleção ou categoria.*Indicado/ })).toBeChecked()
    expect(screen.getAllByRole("radio")).toHaveLength(4)
  })

  it("creates a product landing as it always did: the template, and the product it is built around", async () => {
    const calls = stubApi(SHOP_MODELS)
    const go = vi.fn()
    render(wrap(<NewLanding slug="loja" site={false} go={go} messages={ptBR} web={web} />))
    act(() => useDesignPages.getState().openNew())

    await userEvent.type(await screen.findByLabelText("Nome da página"), "Ofertas de verão")
    await userEvent.click(await screen.findByRole("radio", { name: /Promoção relâmpago/ }))
    expect(screen.getByRole("button", { name: "Criar página" })).toBeDisabled()
    await userEvent.click(await screen.findByRole("button", { name: "Whey Baunilha" }))
    await waitFor(() => expect(screen.getByRole("button", { name: "Criar página" })).toBeEnabled())
    await userEvent.click(screen.getByRole("button", { name: "Criar página" }))

    await waitFor(() => expect(go).toHaveBeenCalledWith("/admin/loja/design?page=p2"))
    expect(bodyOf(calls.find((call) => call.startsWith("POST")))).toEqual({
      title: "Ofertas de verão",
      template: "promocao-relampago",
      productId: "prod-1",
      inMenu: false,
      usesChrome: true,
    })
  })

  it("is grey cards while the list is on its way, and creates nothing yet", async () => {
    let answer: (response: Response) => void = () => undefined
    vi.stubGlobal("fetch", (path: string) =>
      path.includes("/page-templates") ? new Promise<Response>((resolve) => (answer = resolve)) : Promise.resolve(new Response(JSON.stringify({ slug: "ofertas", available: true, reason: null }))),
    )
    render(wrap(<NewLanding slug="loja" site go={vi.fn()} messages={ptBR} web={web} />))
    act(() => useDesignPages.getState().openNew())

    await userEvent.type(await screen.findByLabelText("Nome da página"), "Ofertas")
    expect(within(screen.getByRole("group", { name: "Modelo" })).getByRole("status")).toHaveTextContent("Carregando os modelos")
    expect(screen.getByRole("button", { name: "Criar página" })).toBeDisabled()

    await act(async () => answer(new Response(JSON.stringify(SITE_MODELS))))
    expect(await screen.findByRole("radio", { name: /Em branco/ })).toBeChecked()
    await waitFor(() => expect(screen.getByRole("button", { name: "Criar página" })).toBeEnabled())
  })

  it("says the list could not be read, creates nothing, and reads it again when asked", async () => {
    stubApi("fail")
    render(wrap(<NewLanding slug="loja" site={false} go={vi.fn()} messages={ptBR} web={web} />))
    act(() => useDesignPages.getState().openNew())

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar os modelos.")
    await userEvent.type(screen.getByLabelText("Nome da página"), "Ofertas")
    expect(screen.getByRole("button", { name: "Criar página" })).toBeDisabled()

    stubApi(SHOP_MODELS)
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))
    expect(await screen.findByRole("radio", { name: /Lançamento de produto/ })).toBeChecked()
  })

  it("says in the owner's words why the API refused the template", async () => {
    const calls = stubApi(SITE_MODELS)
    render(wrap(<NewLanding slug="loja" site go={vi.fn()} messages={ptBR} web={web} />))
    act(() => useDesignPages.getState().openNew())
    await userEvent.type(await screen.findByLabelText("Nome da página"), "Ofertas de verão")
    await waitFor(() => expect(screen.getByLabelText("Endereço")).toHaveAccessibleDescription("Disponível"))

    vi.stubGlobal("fetch", (path: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? "GET"} ${path}`)
      return Promise.resolve(new Response(JSON.stringify({ statusCode: 400, errorCode: "PAGE_TEMPLATE_UNAVAILABLE", message: "No" }), { status: 400 }))
    })
    await userEvent.click(screen.getByRole("button", { name: "Criar página" }))

    expect(await screen.findByText("Esse modelo não está disponível para esta loja.")).toBeInTheDocument()
  })
})

describe("landingOptionsOf", () => {
  it("keeps the API's order, what each asks for and what it suggests", () => {
    expect(landingOptionsOf([model("colecao", ["PRODUCT"], { recommended: true }), model("em-branco")] as never)).toEqual([
      { id: "colecao", needsProduct: true, recommended: true },
      { id: "em-branco", needsProduct: false, recommended: false },
    ])
  })

  it("leaves out a model the dialog cannot draw, and one that asks for what it has no field for", () => {
    expect(landingOptionsOf([model("modelo-do-futuro"), model("ofertas"), model("colecao", ["CATEGORY"]), model("em-branco")] as never)).toEqual([
      { id: "em-branco", needsProduct: false, recommended: false },
    ])
  })
})

describe("NewLanding — a shop with more products than one page", () => {
  it("asks the API for the products typed, only the ones for sale", async () => {
    const calls = stubApi(SHOP_MODELS)
    render(wrap(<NewLanding slug="loja" site={false} go={vi.fn()} messages={ptBR} web={web} />))
    act(() => useDesignPages.getState().openNew())

    await userEvent.type(await screen.findByLabelText("Produto principal"), "whey")

    await waitFor(() => expect(calls.some((call) => call.includes("/products?") && call.includes("search=whey"))).toBe(true))
    expect(calls.filter((call) => call.includes("/products?")).every((call) => call.includes("status=ACTIVE"))).toBe(true)
  })
})

describe("PageSettings", () => {
  it("sends only what changed, a cleared search field as null, and reloads the page being edited", async () => {
    const calls = stubApi()
    render(wrap(<PageSettings slug="loja" currentPageId="p1" messages={ptBR} web={web} />))
    act(() => useDesignPages.getState().openSettings("p1"))

    await userEvent.click(await screen.findByRole("switch", { name: "Mostrar nos links da loja" }))
    await userEvent.clear(screen.getByLabelText("Título na busca"))
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))

    await waitFor(() => expect(refresh).toHaveBeenCalled())
    const patch = calls.find((call) => call.startsWith("PATCH"))
    expect(patch).toContain("/api/stores/loja/pages/p1")
    expect(JSON.parse(patch!.split(" ").slice(2).join(" "))).toEqual({ inMenu: true, seo: { title: null } })
  })
})
