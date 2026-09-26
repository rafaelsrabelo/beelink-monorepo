// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

// Types
import type { Section, StorePage } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { ptBR as web } from "@/locales/pt-BR"
import { useDesignPages } from "@/stores/design-pages"
import { useDraftRevision } from "@/stores/draft-revision"
import { PageHistory } from "./page-history"
import { PublishPage } from "./publish-page"

const refresh = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }))

const HOME = {
  id: "home",
  kind: "HOME",
  slug: null,
  title: "Página inicial",
  usesChrome: true,
  inMenu: false,
  status: "PUBLISHED",
  seo: { title: null, description: null, imageUrl: null },
  publishedAt: null,
  createdAt: "2026-09-26T00:00:00.000Z",
  updatedAt: "2026-09-26T00:00:00.000Z",
} satisfies StorePage

const saved = [
  {
    id: "b1",
    name: "Destaques",
    components: [{ id: "c1", kind: "PRODUCTS", title: "Mais vendidos" }],
  },
] as unknown as Section[]

/** Every call, answered as the API would, and remembered as "METHOD path body". */
function stubApi(): string[] {
  const calls: string[] = []
  vi.stubGlobal("fetch", (path: string, init?: RequestInit) => {
    calls.push(`${init?.method ?? "GET"} ${path} ${init?.body ?? ""}`)
    const body = path.endsWith("/problems")
      ? [{ kind: "SHOWCASE_EMPTY", sectionId: "b1", componentId: "c1", itemId: null }]
      : path.endsWith("/versions")
        ? [{ id: "v1", number: 1, note: "Primeira", author: { id: "u1", name: "Ana" }, createdAt: "2026-09-26T12:00:00.000Z", live: true }]
        : { page: HOME, version: { number: 2 }, revision: 1, sections: [] }
    return Promise.resolve(new Response(JSON.stringify(body), { status: init?.method === "POST" && path.endsWith("/publish") ? 201 : 200 }))
  })
  return calls
}

function wrap(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

afterEach(() => {
  vi.unstubAllGlobals()
  refresh.mockReset()
  act(() => useDesignPages.getState().close())
})

describe("PublishPage", () => {
  it("names the problems by block and band, then publishes after the saves, with the note", async () => {
    const calls = stubApi()
    const publish = vi.fn((then?: () => void) => then?.())
    render(wrap(<PublishPage slug="loja" page={HOME} draft={{ publish, saving: false, saved }} messages={ptBR} web={web} />))
    act(() => useDesignPages.getState().openPublish())

    expect(await screen.findByText("Mais vendidos, em Destaques: a vitrine não tem produtos para mostrar.")).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText("Nota para o histórico (opcional)"), "Black Friday")
    await userEvent.click(screen.getByRole("button", { name: "Publicar mesmo assim" }))

    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(publish).toHaveBeenCalledTimes(1)
    const post = calls.find((call) => call.startsWith("POST /api/stores/loja/pages/home/publish"))
    expect(post).toContain('{"note":"Black Friday"}')
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("does not check a draft still being saved", async () => {
    const calls = stubApi()
    render(wrap(<PublishPage slug="loja" page={HOME} draft={{ publish: vi.fn(), saving: true, saved }} messages={ptBR} web={web} />))
    act(() => useDesignPages.getState().openPublish())

    expect(await screen.findByRole("status")).toHaveTextContent("Conferindo a página…")
    expect(calls.some((call) => call.includes("/problems"))).toBe(false)
  })
})

describe("PageHistory", () => {
  it("restores a version into the draft with the revision it read, and never publishes", async () => {
    useDraftRevision.setState({ editing: { loja: "home" }, revisions: { home: 4 }, sending: {}, stale: false })
    const calls = stubApi()
    render(wrap(<PageHistory slug="loja" pageId="home" messages={ptBR} web={web} />))

    await userEvent.click(await screen.findByRole("button", { name: "Restaurar Versão 1" }))
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Restaurar" }))

    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(calls.some((call) => call.startsWith("POST /api/stores/loja/pages/home/versions/v1/restore"))).toBe(true)
    expect(calls.some((call) => call.includes("/publish"))).toBe(false)
    expect(useDraftRevision.getState().revisions["home"]).toBe(5)
  })
})
