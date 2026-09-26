// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { ptBR as web } from "@/locales/pt-BR"
import { useDesignPages } from "@/stores/design-pages"
import { NewLanding } from "./new-landing"
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

/** Every call the dialogs make, answered as the API would, and remembered as "METHOD path body". */
function stubApi(): string[] {
  const calls: string[] = []
  vi.stubGlobal("fetch", (path: string, init?: RequestInit) => {
    calls.push(`${init?.method ?? "GET"} ${path} ${init?.body ?? ""}`)
    const body = path.includes("/availability")
      ? { slug: "ofertas-de-verao", available: true, reason: null }
      : init?.method === "POST" || init?.method === "PATCH"
        ? { ...PAGE, id: "p2" }
        : [PAGE]
    return Promise.resolve(new Response(JSON.stringify(body), { status: init?.method === "POST" ? 201 : 200 }))
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
    expect(JSON.parse(post!.split(" ").slice(2).join(" "))).toEqual({
      title: "Ofertas de verão",
      template: "em-branco",
      productId: null,
      inMenu: false,
      usesChrome: true,
    })
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})

describe("PageSettings", () => {
  it("sends only what changed, a cleared search field as null, and reloads the page being edited", async () => {
    const calls = stubApi()
    render(wrap(<PageSettings slug="loja" currentPageId="p1" messages={ptBR} web={web} />))
    act(() => useDesignPages.getState().openSettings("p1"))

    await userEvent.click(await screen.findByRole("switch", { name: "Mostrar no menu da loja" }))
    await userEvent.clear(screen.getByLabelText("Título na busca"))
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))

    await waitFor(() => expect(refresh).toHaveBeenCalled())
    const patch = calls.find((call) => call.startsWith("PATCH"))
    expect(patch).toContain("/api/stores/loja/pages/p1")
    expect(JSON.parse(patch!.split(" ").slice(2).join(" "))).toEqual({ inMenu: true, seo: { title: null } })
  })
})
