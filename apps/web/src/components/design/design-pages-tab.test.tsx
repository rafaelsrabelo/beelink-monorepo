// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { ptBR as web } from "@/locales/pt-BR"
import { useDesignPages } from "@/stores/design-pages"
import { DesignPagesTab } from "./design-pages-tab"

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))

const page = (id: string, kind: "HOME" | "LANDING", title: string, status = "PUBLISHED") => ({ id, kind, title, slug: kind === "HOME" ? null : id, status, inMenu: false })
const PAGES = [page("home-1", "HOME", "Início"), page("lp-1", "LANDING", "Campanha"), page("lp-2", "LANDING", "Black Friday", "DRAFT")]

function stubApi() {
  vi.stubGlobal("fetch", (path: string) => Promise.resolve(new Response(JSON.stringify(path.endsWith("/pages") ? PAGES : []))))
}

function tab(currentId: string | null) {
  const go = vi.fn()
  const onTemplatesOpen = vi.fn()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <DesignPagesTab slug="loja" currentId={currentId} onNavigate={vi.fn()} go={go} onTemplatesOpen={onTemplatesOpen} messages={ptBR} web={web} />
    </QueryClientProvider>,
  )
  return Object.assign(go, { onTemplatesOpen })
}

const models = async (pageName: string) => {
  await userEvent.click(await screen.findByRole("button", { name: `Ações de ${pageName}` }))
  await userEvent.click(await screen.findByRole("menuitem", { name: "Modelos" }))
}

afterEach(() => {
  vi.unstubAllGlobals()
  act(() => useDesignPages.getState().close())
})

describe("DesignPagesTab — the way to the models", () => {
  it("opens the gallery here for the page being edited, the home included", async () => {
    stubApi()
    const go = tab(null)

    await models("Página inicial")

    expect(useDesignPages.getState().dialog).toEqual({ kind: "templates" })
    expect(go).not.toHaveBeenCalled()
    // The drawer this tab lives in on a phone is told to close: the gallery leaves the editor behind it.
    expect(go.onTemplatesOpen).toHaveBeenCalledTimes(1)
  })

  // A model is written naming the revision of the page the editor has open: another page's gallery is that page's editor.
  it("goes to another page's editor, asked to open its models on arrival", async () => {
    stubApi()
    const go = tab("lp-1")

    await models("Black Friday")
    expect(go).toHaveBeenLastCalledWith("/admin/loja/design?page=lp-2&templates=1")

    await models("Página inicial")
    expect(go).toHaveBeenLastCalledWith("/admin/loja/design?templates=1")
    expect(useDesignPages.getState().dialog).toBeNull()

    await models("Campanha")
    expect(useDesignPages.getState().dialog).toEqual({ kind: "templates" })
    expect(go).toHaveBeenCalledTimes(2)
  })
})
