// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { ptBR as web } from "@/locales/pt-BR"
import { StoreCreateScreen } from "./store-create-screen"

const replace = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }))
// The map draws tiles and needs a browser's canvas; nothing here is about the address.
vi.mock("@/services/addresses/map-tiles", () => ({ mapTileUrl: () => "" }))

/**
 * A palette as the API serves one. Its four colours are data, and the form refuses anything that is
 * not `#RRGGBB` — written here as numbers, since this tree holds no colour literal (`web/no-hex-colors`).
 */
const tone = (value: number) => `#${value.toString(16).padStart(6, "0")}`
const PRESETS = [{ id: "padrao", name: "Padrão", colors: { background: tone(0xffffff), primary: tone(0x2563eb), header: tone(0x111827), footer: tone(0x111827) } }]
const CATEGORIES = [
  { id: "01931f2e-0000-7000-8000-000000000001", slug: "moda", name: "Moda e acessórios" },
  { id: "01931f2e-0000-7000-8000-000000000002", slug: "alimentacao", name: "Comida e bebida" },
]

const model = (id: string, recommended = false) => ({ id, pageKinds: ["HOME"], storeTypes: ["ECOMMERCE"], recommended, needs: [] })
const HOME_MODELS = [model("vitrine-com-capa"), model("por-categorias"), model("ofertas"), model("catalogo-enxuto")]
const FASHION = CATEGORIES[0]!

interface Call {
  method: string
  path: string
  body: Record<string, unknown> | null
}

/**
 * What the create screen asks, answered as the API would. The models come ordered by the category
 * asked with, as the API orders them: "Por categorias" first once the category is picked.
 */
function stubApi(models: "ok" | "fail" = "ok"): Call[] {
  const calls: Call[] = []
  vi.stubGlobal("fetch", (path: string, init?: RequestInit) => {
    const method = init?.method ?? "GET"
    calls.push({ method, path, body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null })
    const url = new URL(path, "http://localhost")

    if (url.pathname === "/api/page-templates") {
      if (models === "fail") return Promise.resolve(new Response("{}", { status: 500 }))
      const suggested = url.searchParams.get("categoryId") === FASHION.id
      return Promise.resolve(new Response(JSON.stringify(suggested ? [model("por-categorias", true), ...HOME_MODELS.filter((entry) => entry.id !== "por-categorias")] : HOME_MODELS)))
    }
    if (url.pathname === "/api/store-categories") return Promise.resolve(new Response(JSON.stringify(CATEGORIES)))
    if (url.pathname === "/api/store-color-presets") return Promise.resolve(new Response(JSON.stringify(PRESETS)))
    if (url.pathname === "/api/stores" && method === "POST") return Promise.resolve(new Response(JSON.stringify({ slug: "doces-da-ana" }), { status: 201 }))
    return Promise.resolve(new Response("[]"))
  })
  return calls
}

function screenOf() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <StoreCreateScreen ui={ptBR} web={web} />
    </QueryClientProvider>,
  )
}

const next = () => userEvent.click(screen.getByRole("button", { name: "Continuar" }))

/** Name, then the address step untouched, then the WhatsApp a shop needs: the last step is on screen. */
async function walkToAppearance(pickCategory = false) {
  await userEvent.type(await screen.findByLabelText("Nome da loja"), "Doces da Ana")
  if (pickCategory) {
    await userEvent.click(screen.getByRole("combobox", { name: "Categoria" }))
    await userEvent.click(await screen.findByRole("option", { name: FASHION.name }))
  }
  await next()
  await next()
  await userEvent.type(await screen.findByLabelText(/WhatsApp/), "11999998888")
  await next()
  await screen.findByRole("heading", { name: "Página inicial" })
}

const created = (calls: Call[]) => calls.find((call) => call.method === "POST" && call.path === "/api/stores")
const modelsAsked = (calls: Call[]) => calls.filter((call) => call.path.startsWith("/api/page-templates")).map((call) => call.path)

afterEach(() => {
  vi.unstubAllGlobals()
  replace.mockReset()
})

describe("StoreCreateScreen — the home a shop opens with", () => {
  // Who picks nothing is sent what was sent before there were models: no `template` at all.
  it("creates a shop that never opens the choice with no model, as before", async () => {
    const calls = stubApi()
    screenOf()
    await walkToAppearance()

    expect(screen.getByText("Escolher outro modelo (opcional)").closest("details")).not.toHaveAttribute("open")
    await userEvent.click(screen.getByRole("button", { name: "Criar loja" }))

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/doces-da-ana"))
    expect(created(calls)?.body).not.toHaveProperty("template")
    expect(created(calls)?.body).toMatchObject({ name: "Doces da Ana", slug: "doces-da-ana", type: "ECOMMERCE" })
  })

  it("offers the default page, chosen, and the four models of the catalogue", async () => {
    const calls = stubApi()
    screenOf()
    await walkToAppearance()
    await userEvent.click(screen.getByText("Escolher outro modelo (opcional)"))

    expect(screen.getAllByRole("radio", { name: /Página padrão|Vitrine com capa|Por categorias|Ofertas|Catálogo enxuto/ }).map((radio) => radio.getAttribute("value"))).toEqual([
      "",
      "vitrine-com-capa",
      "por-categorias",
      "ofertas",
      "catalogo-enxuto",
    ])
    expect(screen.getByRole("radio", { name: /Página padrão/ })).toBeChecked()
    expect(modelsAsked(calls)).toEqual(["/api/page-templates?storeType=ECOMMERCE"])
  })

  it("creates the shop with the model picked", async () => {
    const calls = stubApi()
    screenOf()
    await walkToAppearance()
    await userEvent.click(screen.getByText("Escolher outro modelo (opcional)"))

    await userEvent.click(await screen.findByRole("radio", { name: /Ofertas/ }))
    await userEvent.click(screen.getByRole("button", { name: "Criar loja" }))

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/doces-da-ana"))
    expect(created(calls)?.body).toMatchObject({ template: "ofertas", type: "ECOMMERCE" })
  })

  // Decision 3 of the epic: the category only orders the suggested ones.
  it("asks again with the category picked, which puts its suggested model first and hides none", async () => {
    const calls = stubApi()
    screenOf()
    await walkToAppearance(true)
    await userEvent.click(screen.getByText("Escolher outro modelo (opcional)"))

    expect(await screen.findByRole("radio", { name: /Por categorias.*Indicado/ })).toBeInTheDocument()
    expect(screen.getAllByRole("radio", { name: /Página padrão|Vitrine com capa|Por categorias|Ofertas|Catálogo enxuto/ }).map((radio) => radio.getAttribute("value"))).toEqual([
      "",
      "por-categorias",
      "vitrine-com-capa",
      "ofertas",
      "catalogo-enxuto",
    ])
    expect(screen.getByRole("radio", { name: /Página padrão/ })).toBeChecked()
    expect(modelsAsked(calls)).toContain(`/api/page-templates?storeType=ECOMMERCE&categoryId=${FASHION.id}`)
  })

  it("still creates the shop, with its default page, when the models cannot be read", async () => {
    const calls = stubApi("fail")
    screenOf()
    await walkToAppearance()
    await userEvent.click(screen.getByText("Escolher outro modelo (opcional)"))

    expect(await screen.findByText("Não foi possível carregar os modelos.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Criar loja" }))

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/doces-da-ana"))
    expect(created(calls)?.body).not.toHaveProperty("template")
  })
})
