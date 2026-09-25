// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

// Block
import { DesignEditorFrame, type DesignEditorFrameProps } from "./design-editor-frame"

const original = window.matchMedia

function screenIs(wide: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: wide,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as typeof window.matchMedia
}

const noop = () => undefined

function frame(overrides: Partial<DesignEditorFrameProps> = {}) {
  return (
    <DesignEditorFrame
      bar={<header>barra</header>}
      structure={<p>a lista de faixas</p>}
      preview={<p>a loja</p>}
      inspector={<p>os campos do bloco</p>}
      structureOpen={false}
      onStructureOpenChange={noop}
      inspectorOpen={false}
      onInspectorOpenChange={noop}
      {...overrides}
    />
  )
}

function renderFrame(overrides: Partial<DesignEditorFrameProps> = {}) {
  return render(frame(overrides))
}

afterEach(() => {
  window.matchMedia = original
})

describe("DesignEditorFrame", () => {
  it("draws structure, preview and panel side by side where the three fit", () => {
    screenIs(true)
    renderFrame()

    expect(screen.getByRole("complementary", { name: "Estrutura da página" })).toHaveTextContent("a lista de faixas")
    expect(screen.getByRole("main", { name: "Prévia da loja" })).toHaveTextContent("a loja")
    expect(screen.getByRole("complementary", { name: "Editar bloco" })).toHaveTextContent("os campos do bloco")
  })

  it("keeps the side columns in drawers on a narrow screen, each drawn once", () => {
    screenIs(false)
    const { rerender } = renderFrame()

    expect(screen.getByRole("main", { name: "Prévia da loja" })).toBeInTheDocument()
    expect(screen.queryByText("a lista de faixas")).not.toBeInTheDocument()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    rerender(frame({ inspectorOpen: true }))
    expect(screen.getByRole("dialog", { name: "Editar" })).toHaveTextContent("os campos do bloco")
    // Drawn once: a form being typed in never has a second copy.
    expect(screen.getAllByText("os campos do bloco")).toHaveLength(1)
  })

  // Closing the drawer to look at the page must not throw away what was typed and not yet saved.
  it("keeps what was typed in the Editar drawer through closing and opening it again", async () => {
    screenIs(false)
    const inspector = <input aria-label="Título do bloco" />
    const { rerender } = render(frame({ inspector, inspectorOpen: true }))

    await userEvent.type(screen.getByLabelText("Título do bloco"), "Digitado")
    rerender(frame({ inspector, inspectorOpen: false }))
    rerender(frame({ inspector, inspectorOpen: true }))

    expect(screen.getByLabelText("Título do bloco")).toHaveValue("Digitado")
  })

  it("names its one close button in the screen's language, and leaves it out where the panel has its own", () => {
    screenIs(false)
    const { rerender } = render(frame({ structureOpen: true }))
    expect(screen.getByRole("button", { name: "Fechar" })).toBeInTheDocument()

    rerender(frame({ inspectorOpen: true, inspectorHasOwnClose: true }))
    expect(screen.queryByRole("button", { name: "Fechar" })).not.toBeInTheDocument()
  })

  it("closes its drawers when the screen widens, so they cannot pop back up", () => {
    screenIs(true)
    const onStructureOpenChange = vi.fn()
    const onInspectorOpenChange = vi.fn()
    render(frame({ structureOpen: true, inspectorOpen: true, onStructureOpenChange, onInspectorOpenChange }))

    expect(onStructureOpenChange).toHaveBeenCalledWith(false)
    expect(onInspectorOpenChange).toHaveBeenCalledWith(false)
  })
})
