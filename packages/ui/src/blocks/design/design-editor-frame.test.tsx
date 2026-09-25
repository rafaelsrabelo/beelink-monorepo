// Libs
import { act, render, renderHook, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

// Block
import { DesignEditorFrame, usePreviewDevice, type DesignEditorFrameProps } from "./design-editor-frame"

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

  // A move or a choice made by the keys is said aloud, once, from one place.
  it("says what the editor did in a status line, and hears its keys", async () => {
    screenIs(true)
    const onKeyDown = vi.fn()
    renderFrame({ status: "Banner 1 agora está na posição 2.", onKeyDown, preview: <button type="button">Banner 1</button> })

    expect(screen.getByRole("status")).toHaveTextContent("Banner 1 agora está na posição 2.")
    screen.getByRole("button", { name: "Banner 1" }).focus()
    await userEvent.keyboard("{ArrowDown}")
    expect(onKeyDown).toHaveBeenCalled()
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

/**
 * A window `width` px wide: each `(min-width: Nrem)` query answers against it, so the bar's `sm:`
 * and the columns' `lg:` can disagree the way they do between 640 and 1023 px. `resize` tells the
 * listeners, as a real window does.
 */
function windowOf(width: number) {
  const listeners = new Set<() => void>()
  let current = width
  window.matchMedia = ((query: string) => ({
    get matches() {
      const rem = Number(/min-width:\s*([\d.]+)rem/.exec(query)?.[1] ?? 0)
      return current >= rem * 16
    },
    media: query,
    onchange: null,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia

  return {
    resize(next: number) {
      current = next
      act(() => listeners.forEach((listener) => listener()))
    },
  }
}

describe("usePreviewDevice", () => {
  // The owner's call: a phone preview stacks every row of blocks side by side.
  it("starts on the computer", () => {
    windowOf(1440)

    const { result } = renderHook(() => usePreviewDevice())

    expect(result.current[0]).toBe("DESKTOP")
  })

  it("keeps the device the owner picks", () => {
    windowOf(1440)
    const { result, rerender } = renderHook(() => usePreviewDevice())

    act(() => result.current[1]("PHONE"))
    rerender()

    expect(result.current[0]).toBe("PHONE")
  })

  // Below the bar's `sm:` the toggle is not drawn, so a computer preview there could not be left.
  it("draws the phone where the bar has no room for the toggle", () => {
    windowOf(390)

    const { result } = renderHook(() => usePreviewDevice())

    expect(result.current[0]).toBe("PHONE")
  })

  it("keeps the toggle's choice between the drawers' width and the columns'", () => {
    windowOf(800)

    const { result } = renderHook(() => usePreviewDevice())

    expect(result.current[0]).toBe("DESKTOP")
  })

  it("gives the pick back when the window widens again", () => {
    const screenSize = windowOf(1440)
    const { result } = renderHook(() => usePreviewDevice())

    screenSize.resize(390)
    expect(result.current[0]).toBe("PHONE")

    screenSize.resize(1440)
    expect(result.current[0]).toBe("DESKTOP")
  })
})
