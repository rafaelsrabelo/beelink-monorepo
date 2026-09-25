// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { DesignEditorBar, type DesignEditorBarProps } from "./design-editor-bar"

function renderBar(overrides: Partial<DesignEditorBarProps> = {}) {
  const props: DesignEditorBarProps = {
    backHref: "/admin/loja",
    shopName: "Loja do Design",
    pageName: "Página inicial",
    device: "PHONE",
    onDeviceChange: vi.fn(),
    changes: 0,
    publishing: false,
    onPublish: vi.fn(),
    onDiscard: vi.fn(),
    shopHref: "/loja",
    onOpenStructure: vi.fn(),
    onOpenInspector: vi.fn(),
    ...overrides,
  }
  return { ...render(<DesignEditorBar {...props} />), props }
}

describe("DesignEditorBar", () => {
  it("goes back to the panel and says where the page is", () => {
    renderBar()

    expect(screen.getByRole("link", { name: "Painel" })).toHaveAttribute("href", "/admin/loja")
    expect(screen.getByText("Loja do Design")).toBeInTheDocument()
    expect(screen.getByText("Página inicial")).toBeInTheDocument()
  })

  it("reads as published with nothing to write, and offers neither publish nor discard", () => {
    renderBar()

    expect(screen.getByRole("status")).toHaveTextContent("Publicado")
    expect(screen.getByRole("button", { name: "Publicar" })).toBeDisabled()
    expect(screen.queryByRole("button", { name: "Descartar" })).not.toBeInTheDocument()
  })

  it("counts what Publish would write, and says one alteration in the singular", async () => {
    const { rerender, props } = renderBar({ changes: 3 })

    expect(screen.getByRole("status")).toHaveTextContent("Rascunho · 3 alterações")
    await userEvent.click(screen.getByRole("button", { name: "Publicar" }))
    expect(props.onPublish).toHaveBeenCalled()
    await userEvent.click(screen.getByRole("button", { name: "Descartar" }))
    expect(props.onDiscard).toHaveBeenCalled()

    rerender(<DesignEditorBar {...props} changes={1} />)
    expect(screen.getByRole("status")).toHaveTextContent("Rascunho · 1 alteração")
  })

  it("lets the screen stop the way back, to ask first", async () => {
    const onBack = vi.fn((event: { preventDefault: () => void }) => event.preventDefault())
    renderBar({ onBack })

    await userEvent.click(screen.getByRole("link", { name: "Painel" }))
    expect(onBack).toHaveBeenCalled()
  })

  it("opens the shop window in a tab of its own", () => {
    renderBar()

    const shop = screen.getByRole("link", { name: /Ver na loja/ })
    expect(shop).toHaveAttribute("href", "/loja")
    expect(shop).toHaveAttribute("target", "_blank")
  })

  it("switches the preview's device and opens the side columns as drawers", async () => {
    const { props } = renderBar()

    await userEvent.click(screen.getByRole("button", { name: "Computador" }))
    expect(props.onDeviceChange).toHaveBeenCalledWith("DESKTOP")
    await userEvent.click(screen.getByRole("button", { name: "Estrutura" }))
    expect(props.onOpenStructure).toHaveBeenCalled()
    await userEvent.click(screen.getByRole("button", { name: "Editar" }))
    expect(props.onOpenInspector).toHaveBeenCalled()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderBar({ changes: 2 })
    await expectNoA11yViolations(container)
  })
})
