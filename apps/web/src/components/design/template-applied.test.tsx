// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

// Types
import type { Section, StorePage } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { useDesignPages } from "@/stores/design-pages"
import { TemplateApplied } from "./template-applied"

const HOME = { id: "home-1", kind: "HOME", title: "Página inicial", status: "PUBLISHED" } as unknown as StorePage
const saved = [{ id: "b1", name: null, components: [{ id: "c1", kind: "PRODUCTS", title: "Todos os produtos" }] }] as unknown as Section[]

/** The page's problems as the API would list them, and every path asked. */
function stubProblems(problems: object[] | "fail" = []): string[] {
  const calls: string[] = []
  vi.stubGlobal("fetch", (path: string) => {
    calls.push(path)
    return Promise.resolve(problems === "fail" ? new Response("{}", { status: 503 }) : new Response(JSON.stringify(problems)))
  })
  return calls
}

function notice(saving = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TemplateApplied slug="loja" page={HOME} draft={{ saving, saved }} messages={ptBR} />
    </QueryClientProvider>,
  )
}

const apply = (pageId = "home-1") => act(() => useDesignPages.getState().noteApplied({ pageId, templateId: "ofertas" }))

afterEach(() => {
  vi.unstubAllGlobals()
  act(() => {
    useDesignPages.getState().close()
    useDesignPages.getState().dismissApplied()
  })
})

describe("TemplateApplied", () => {
  it("says nothing, and asks for nothing, until a model is applied to this page", () => {
    const calls = stubProblems()
    notice()

    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(calls).toEqual([])

    // Another page's model is not this page's news.
    apply("lp-9")
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(calls).toEqual([])
  })

  it("says which model is in the draft and that it is not published, and reads the page's problems again", async () => {
    const calls = stubProblems([{ kind: "SHOWCASE_EMPTY", sectionId: "b1", componentId: "c1", itemId: null }])
    notice()
    apply()

    expect(screen.getByRole("status")).toHaveTextContent("Modelo Ofertas aplicado ao rascunho. A loja só muda quando você publicar.")
    expect(await within(screen.getByRole("status")).findByRole("listitem")).toHaveTextContent(
      "Todos os produtos, em Faixa 1: a vitrine não tem produtos para mostrar.",
    )
    expect(calls).toEqual(["/api/stores/loja/pages/home-1/problems"])
  })

  it("lists nothing when the page has no problem, or when the check did not answer", async () => {
    const calls = stubProblems("fail")
    notice()
    apply()

    await waitFor(() => expect(screen.queryByText("Conferindo a página…")).not.toBeInTheDocument())
    expect(calls).toHaveLength(1)
    expect(screen.getByRole("status")).toHaveTextContent("Modelo Ofertas aplicado ao rascunho.")
    expect(screen.queryByRole("list")).not.toBeInTheDocument()
  })

  // A list of the draft before the last save lands is a list of the wrong page.
  it("waits for what the editor is still saving before it checks", () => {
    const calls = stubProblems()
    notice(true)
    apply()

    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(calls).toEqual([])
  })

  it("opens Publicar, and goes away when told to", async () => {
    stubProblems()
    notice()
    apply()

    await userEvent.click(screen.getByRole("button", { name: "Publicar" }))
    expect(useDesignPages.getState().dialog).toEqual({ kind: "publish" })

    await userEvent.click(screen.getByRole("button", { name: "Dispensar o aviso" }))
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(useDesignPages.getState().applied).toBeNull()
  })
})
