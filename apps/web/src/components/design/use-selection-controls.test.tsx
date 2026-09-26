// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render as renderTree, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactElement } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { en as web } from "@/locales/en"
import { useDesignEdit } from "@/stores/design-edit"
import { toBandForm } from "./band-form-values"
import { toForm } from "./component-form-values"
import { toDraft, type SectionDraft } from "./design-draft"
import { saved } from "./design-draft.fixtures"
import { arrangementOf } from "./design-draft-preview"
import { targetOf, type DesignSelection } from "./design-selection"
import { useSelectionControls, type SelectionControlsInput } from "./use-selection-controls"

// Band "a" holds one banner, titled "a1"; band "b" holds a heading and a showcase; band "c" the promises.
const rows = saved.map(toDraft)

function Harness({ selection, ...over }: { selection: DesignSelection | null } & Partial<SelectionControlsInput>) {
  const controls = useSelectionControls({
    slug: "loja",
    rows,
    saved,
    bands: arrangementOf(rows, saved, new Map()),
    target: targetOf(selection, rows),
    draft: { edit: vi.fn(), patchSection: vi.fn(), patchComponent: vi.fn() },
    choose: vi.fn(),
    onLayoutTab: vi.fn(),
    onDelete: vi.fn(),
    bandName: (id) => `Faixa ${id}`,
    messages: ptBR,
    web,
    ...over,
  })

  return (
    <div onKeyDown={controls.onKeyDown}>
      <main>
        <button type="button" data-design-node="a">Banner</button>
        <button type="button" data-design-node="b">Faixa b</button>
        <button type="button" data-design-node="b1">b1</button>
        <label>
          Título
          <input />
        </label>
        {controls.bar}
      </main>
      <p role="status">{controls.status}</p>
    </div>
  )
}

function draftSpy() {
  const state = { rows: rows as SectionDraft[] }
  return {
    state,
    draft: {
      edit: vi.fn((next: SectionDraft[] | ((current: SectionDraft[]) => SectionDraft[])) => {
        state.rows = typeof next === "function" ? next(state.rows) : next
      }),
      patchSection: vi.fn(),
      patchComponent: vi.fn(),
    },
  }
}

function render(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return renderTree(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

beforeEach(() => useDesignEdit.getState().close())
afterEach(() => vi.unstubAllGlobals())

describe("useSelectionControls — the keys", () => {
  it("chooses the next stop with ↓ and keeps the focus with the keys", async () => {
    const choose = vi.fn()
    render(<Harness selection={{ level: "block", id: "a1" }} choose={choose} />)

    screen.getByRole("button", { name: "Banner" }).focus()
    await userEvent.keyboard("{ArrowDown}")

    expect(choose).toHaveBeenCalledWith({ level: "band", id: "b" }, { openDrawer: false, takeFocus: false })
    expect(screen.getByRole("status")).toHaveTextContent("Faixa b.")
  })

  it("moves the stop with Alt+↓, and says where it landed", async () => {
    const { draft, state } = draftSpy()
    render(<Harness selection={null} draft={draft} />)

    screen.getByRole("button", { name: "Banner" }).focus()
    await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}")

    expect(state.rows.map((row) => row.id)).toEqual(["b", "a", "c"])
    expect(screen.getByRole("status")).toHaveTextContent("a1 agora está na posição 2.")
  })

  it("asks before deleting with Delete", async () => {
    const onDelete = vi.fn()
    render(<Harness selection={null} onDelete={onDelete} />)

    screen.getByRole("button", { name: "b1" }).focus()
    await userEvent.keyboard("{Delete}")

    expect(onDelete).toHaveBeenCalledWith({ level: "component", id: "b1", name: "b1" })
  })

  // The last showcase of the shop cannot go, and its band holds it.
  it("does not offer to delete a band holding the shop's last showcase", async () => {
    const onDelete = vi.fn()
    render(<Harness selection={null} onDelete={onDelete} />)

    screen.getByRole("button", { name: "Faixa b" }).focus()
    await userEvent.keyboard("{Backspace}")

    expect(onDelete).not.toHaveBeenCalled()
  })

  it("reacts to nothing typed in a field", async () => {
    const choose = vi.fn()
    const onDelete = vi.fn()
    render(<Harness selection={{ level: "block", id: "a1" }} choose={choose} onDelete={onDelete} />)

    await userEvent.type(screen.getByRole("textbox", { name: "Título" }), "ab{Backspace}{ArrowDown}{Alt>}{ArrowUp}{/Alt}")

    expect(choose).not.toHaveBeenCalled()
    expect(onDelete).not.toHaveBeenCalled()
  })

  // One key from losing what was typed: the keys say why they did not move instead.
  it("will not choose another while the open panel has unsaved fields", async () => {
    const choose = vi.fn()
    const banner = saved[0]!.components[0]!
    useDesignEdit.getState().open({
      sectionId: "a",
      band: toBandForm(saved[0]!),
      bandOpened: toBandForm(saved[0]!),
      component: { id: banner.id, value: { ...toForm(banner), title: "Digitado" }, linkId: "l1" },
    })
    render(<Harness selection={{ level: "block", id: "a1" }} choose={choose} />)

    screen.getByRole("button", { name: "Banner" }).focus()
    await userEvent.keyboard("{ArrowDown}")

    expect(choose).not.toHaveBeenCalled()
    expect(screen.getByRole("status")).toHaveTextContent("Salve ou cancele o que mudou em a1 antes de escolher outro.")
  })
})

describe("useSelectionControls — the bar", () => {
  // A lone block acts as its band: Subir is disabled at the top, and hiding hides the band.
  it("acts on a lone block's band, and on the block for its layout", async () => {
    const onLayoutTab = vi.fn()
    const { draft } = draftSpy()
    render(<Harness selection={{ level: "block", id: "a1" }} draft={draft} onLayoutTab={onLayoutTab} />)

    expect(screen.getByRole("toolbar", { name: "Ações de a1" })).toHaveAttribute("data-design-node", "a")
    expect(screen.getByRole("button", { name: "Subir a1" })).toBeDisabled()
    await userEvent.click(screen.getByRole("button", { name: "Ocultar a1" }))
    expect(draft.patchSection).toHaveBeenCalledWith("a", { isActive: false })

    await userEvent.click(screen.getByRole("button", { name: "Trocar layout de a1" }))
    await userEvent.click(await screen.findByRole("menuitemradio", { name: "Grade" }))
    expect(draft.patchComponent).toHaveBeenCalledWith("a1", { display: "GRID" })
    expect(onLayoutTab).toHaveBeenCalled()
  })

  it("hides a block of several on its own, and has no bin for the shop's last showcase", async () => {
    const { draft } = draftSpy()
    render(<Harness selection={{ level: "block", id: "b2" }} draft={draft} />)

    await userEvent.click(screen.getByRole("button", { name: "Ocultar Vitrine de produtos" }))

    expect(draft.patchComponent).toHaveBeenCalledWith("b2", { isActive: false })
    expect(screen.queryByRole("button", { name: /Excluir/ })).not.toBeInTheDocument()
  })

  it("draws no bar while nothing is chosen", () => {
    render(<Harness selection={null} />)

    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument()
  })
})

describe("useSelectionControls — Duplicar", () => {
  const copy = { ...saved[1]!.components[0]!, id: "b1-copy", isActive: false }

  it("shows the copy right after the block in the draft, chooses it, and says so", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(copy, { status: 201 })))
    const choose = vi.fn()
    const { draft, state } = draftSpy()
    render(<Harness selection={{ level: "block", id: "b1" }} draft={draft} choose={choose} />)

    await userEvent.click(screen.getByRole("button", { name: "Duplicar b1" }))

    await screen.findByText("Cópia de b1 criada logo depois. Vai para a loja quando você publicar.")
    expect(state.rows[1]?.components.map((block) => [block.id, block.isActive])).toEqual([
      ["b1", true],
      ["b1-copy", true],
      ["b2", true],
    ])
    expect(choose).toHaveBeenCalledWith({ level: "block", id: "b1-copy" }, { openDrawer: false, takeFocus: false })
  })

  // ⌘/Ctrl+D would bookmark the page; with the focus on a stop it copies instead.
  it("copies with Ctrl+D from a stop", async () => {
    const fetchSpy = vi.fn(async () => Response.json(copy, { status: 201 }))
    vi.stubGlobal("fetch", fetchSpy)
    render(<Harness selection={null} />)

    screen.getByRole("button", { name: "b1" }).focus()
    await userEvent.keyboard("{Control>}d{/Control}")

    expect(fetchSpy).toHaveBeenCalledWith("/api/stores/loja/components/b1/duplicate", expect.objectContaining({ method: "POST" }))
  })

  it("says why a copy was refused", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ errorCode: "STORE_FORBIDDEN" }, { status: 403 })))
    render(<Harness selection={{ level: "block", id: "b1" }} />)

    await userEvent.click(screen.getByRole("button", { name: "Duplicar b1" }))

    await waitFor(() => expect(screen.getByRole("status")).not.toBeEmptyDOMElement())
  })
})
