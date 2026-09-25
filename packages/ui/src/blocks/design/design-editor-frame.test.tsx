// Libs
import { render, screen } from "@testing-library/react"
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

function renderFrame(overrides: Partial<DesignEditorFrameProps> = {}) {
  return render(
    <DesignEditorFrame
      bar={<header>barra</header>}
      structure={<p>a lista de faixas</p>}
      preview={<p>a loja</p>}
      inspector={<p>os campos do bloco</p>}
      structureOpen={false}
      onStructureOpenChange={vi.fn()}
      inspectorOpen={false}
      onInspectorOpenChange={vi.fn()}
      {...overrides}
    />,
  )
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

  it("keeps the side columns in drawers on a narrow screen, drawn only when opened", () => {
    screenIs(false)
    const { rerender } = renderFrame()

    expect(screen.getByRole("main", { name: "Prévia da loja" })).toBeInTheDocument()
    expect(screen.queryByText("a lista de faixas")).not.toBeInTheDocument()
    expect(screen.queryByText("os campos do bloco")).not.toBeInTheDocument()

    rerender(
      <DesignEditorFrame
        bar={<header>barra</header>}
        structure={<p>a lista de faixas</p>}
        preview={<p>a loja</p>}
        inspector={<p>os campos do bloco</p>}
        structureOpen={false}
        onStructureOpenChange={vi.fn()}
        inspectorOpen
        onInspectorOpenChange={vi.fn()}
      />,
    )
    expect(screen.getByRole("dialog", { name: "Editar" })).toHaveTextContent("os campos do bloco")
    // Drawn once: a form being typed in never has a second copy.
    expect(screen.getAllByText("os campos do bloco")).toHaveLength(1)
  })
})
