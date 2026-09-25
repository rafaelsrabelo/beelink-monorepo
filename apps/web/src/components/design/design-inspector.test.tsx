// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { Section, StoreComponent } from "@harness-monorepo/contracts"
import type { InspectorTab } from "@harness-monorepo/ui/blocks/design/inspector-tabs"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { en as web } from "@/locales/en"
import { useDesignEdit } from "@/stores/design-edit"
import { toDraft } from "./design-draft"
import { DesignInspector } from "./design-inspector"
import type { SelectionTarget } from "./design-selection"

const uploading = vi.hoisted(() => ({ pending: false }))
vi.mock("@/services/uploads/upload-hooks", () => ({
  useImageUpload: () => ({ upload: () => Promise.resolve(""), pending: uploading.pending }),
}))

function block(id: string, over: Partial<StoreComponent> = {}): StoreComponent {
  return {
    id,
    sectionId: "b1",
    kind: "HEADING",
    title: "Novidades",
    subtitle: null,
    body: null,
    span: "FULL",
    display: null,
    source: null,
    sourceCategoryId: null,
    limit: null,
    items: [],
    columns: null,
    align: null,
    position: 0,
    isActive: true,
    createdAt: "2026-09-24T00:00:00.000Z",
    updatedAt: "2026-09-24T00:00:00.000Z",
    ...over,
  }
}

const band: Section = {
  id: "b1",
  name: null,
  width: "CONTAINED",
  background: null,
  position: 0,
  isActive: true,
  components: [block("c1"), block("c2", { title: "Outro", position: 1 })],
  createdAt: "2026-09-24T00:00:00.000Z",
  updatedAt: "2026-09-24T00:00:00.000Z",
}

const onBlock = (id: string): SelectionTarget => ({ level: "block", id, sectionId: "b1" })

interface Props {
  target: SelectionTarget | null
  tab?: InspectorTab
  onClose?: () => void
  onLayoutChange?: () => void
}

function Screen({ target, tab = "content", onClose = vi.fn(), onLayoutChange = vi.fn() }: Props) {
  return (
    <>
      <button type="button">Bloco no preview</button>
      <button type="button">Linha na lista</button>
      <DesignInspector
        slug="loja"
        target={target}
        rows={[toDraft(band)]}
        saved={[band]}
        tab={tab}
        onTabChange={vi.fn()}
        onLayoutChange={onLayoutChange}
        pageBackground=""
        categoriesShown={0}
        shelves={new Map()}
        onClose={onClose}
        onSaved={vi.fn()}
        messages={ptBR}
        web={web}
      />
    </>
  )
}

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>

/** Every write the panel sends, answered as the API would — the band's refused when told to. */
function stubApi({ refuseBand = false } = {}) {
  const calls: { method: string; body: unknown }[] = []
  vi.stubGlobal("fetch", (_path: string, init: RequestInit) => {
    calls.push({ method: init.method ?? "GET", body: init.body ? JSON.parse(String(init.body)) : null })
    if (init.method === "PUT" && refuseBand) return Promise.resolve(new Response(JSON.stringify({ errorCode: "UNKNOWN" }), { status: 409 }))
    return Promise.resolve(new Response(JSON.stringify(init.method === "PUT" ? band : band.components[0]), { status: 200 }))
  })
  return calls
}

beforeEach(() => {
  useDesignEdit.getState().close()
  uploading.pending = false
})
afterEach(() => vi.unstubAllGlobals())

describe("DesignInspector — the panel's focus", () => {
  // Chosen from the preview, the focus would otherwise stay on the block there.
  it("takes the focus to its title, and gives it back to the opener when it closes", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { rerender } = render(<Screen target={null} onClose={onClose} />, { wrapper })
    screen.getByRole("button", { name: "Bloco no preview" }).focus()

    rerender(<Screen target={onBlock("c1")} onClose={onClose} />)
    expect(screen.getByRole("heading", { name: "Editar componente" })).toHaveFocus()
    expect(screen.getByRole("region", { name: "Editar componente" })).toHaveTextContent("Novidades")

    await user.click(screen.getByRole("button", { name: "Fechar os campos do bloco" }))
    expect(onClose).toHaveBeenCalledOnce()

    rerender(<Screen target={null} onClose={onClose} />)
    expect(screen.getByRole("button", { name: "Bloco no preview" })).toHaveFocus()
  })

  // Chosen from the preview, then another from the list: closing goes back to the list's row.
  it("gives the focus back to the last opener after switching blocks", () => {
    const { rerender } = render(<Screen target={null} />, { wrapper })
    screen.getByRole("button", { name: "Bloco no preview" }).focus()
    rerender(<Screen target={onBlock("c1")} />)

    screen.getByRole("button", { name: "Linha na lista" }).focus()
    rerender(<Screen target={onBlock("c2")} />)
    expect(screen.getByRole("heading", { name: "Editar componente" })).toHaveFocus()

    rerender(<Screen target={null} />)
    expect(screen.getByRole("button", { name: "Linha na lista" })).toHaveFocus()
  })
})

describe("DesignInspector — Conteúdo, Layout and Estilo under one Salvar", () => {
  // The owner's "em tempo real": what is typed reaches the preview through the edit, before Salvar.
  it("hands what is typed to the preview before Salvar, and forgets it on Cancelar", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Screen target={onBlock("c1")} onClose={onClose} />, { wrapper })

    const title = screen.getByRole("textbox", { name: /Título/ })
    await user.clear(title)
    await user.type(title, "Coleção nova")
    expect(useDesignEdit.getState().edit).toMatchObject({ component: { id: "c1", value: { title: "Coleção nova" } } })

    await user.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(useDesignEdit.getState().edit).toBeNull()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("writes the block, then the band, when Estilo changed", async () => {
    const user = userEvent.setup()
    const calls = stubApi()
    const onClose = vi.fn()
    render(<Screen target={onBlock("c1")} tab="style" onClose={onClose} />, { wrapper })

    await user.type(screen.getByLabelText("Nome da faixa"), "Destaques")
    expect(screen.getByText("Vale para os 2 blocos desta faixa.")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Salvar" }))

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(calls.map((call) => call.method)).toEqual(["PATCH", "PUT"])
    expect(calls[1]?.body).toEqual({ name: "Destaques" })
    expect(useDesignEdit.getState().edit).toBeNull()
  })

  // A save that only changed the words touches one row, not two.
  it("writes the band only when Estilo changed it", async () => {
    const user = userEvent.setup()
    const calls = stubApi()
    const onClose = vi.fn()
    render(<Screen target={onBlock("c1")} onClose={onClose} />, { wrapper })

    await user.type(screen.getByRole("textbox", { name: /Título/ }), "!")
    await user.click(screen.getByRole("button", { name: "Salvar" }))

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(calls.map((call) => call.method)).toEqual(["PATCH"])
    expect(calls[0]?.body).not.toHaveProperty("align")
  })

  it("says why the band was refused, and stays open with it", async () => {
    const user = userEvent.setup()
    stubApi({ refuseBand: true })
    const onClose = vi.fn()
    render(<Screen target={onBlock("c1")} tab="style" onClose={onClose} />, { wrapper })

    await user.type(screen.getByLabelText("Nome da faixa"), "Destaques")
    await user.click(screen.getByRole("button", { name: "Salvar" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(web.errors.UNKNOWN)
    expect(onClose).not.toHaveBeenCalled()
  })

  // Layout waits for Publicar: it goes to the draft, and Salvar never carries it.
  it("hands a Layout change to the draft, not to Salvar", async () => {
    const user = userEvent.setup()
    const onLayoutChange = vi.fn()
    render(<Screen target={onBlock("c1")} tab="layout" onLayoutChange={onLayoutChange} />, { wrapper })

    expect(screen.getByText("Muda na prévia agora; vai para a loja quando você publicar.")).toBeVisible()
    await user.click(screen.getByRole("button", { name: "Direita" }))

    expect(onLayoutChange).toHaveBeenCalledWith("c1", { align: "RIGHT" })
  })

  // Saved mid-upload, the slide went without its picture and the picture then landed nowhere.
  it("holds Salvar while a picture is on its way", () => {
    uploading.pending = true
    render(<Screen target={onBlock("c1")} />, { wrapper })

    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled()
  })

  // A band of several blocks, chosen by its header: its style alone, and a save that writes only it.
  it("edits a band chosen on its own with its style alone", async () => {
    const user = userEvent.setup()
    const calls = stubApi()
    render(<Screen target={{ level: "band", id: "b1", blockId: null }} tab="content" />, { wrapper })

    expect(screen.getByRole("heading", { name: "Editar faixa" })).toBeInTheDocument()
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument()

    await user.type(screen.getByLabelText("Nome da faixa"), "Serviços")
    await user.click(screen.getByRole("button", { name: "Salvar" }))

    await waitFor(() => expect(calls.map((call) => call.method)).toEqual(["PUT"]))
    expect(calls[0]?.body).toEqual({ name: "Serviços" })
  })
})
