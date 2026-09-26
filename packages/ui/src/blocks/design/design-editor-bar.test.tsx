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
    device: "DESKTOP",
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
  it("goes back to the panel and says where the page is, as the screen's heading", () => {
    renderBar()

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Modo design: Loja do Design/Página inicial")

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

  it("says a change is being saved, first, and holds Publicar until it is", () => {
    renderBar({ saving: true, unpublished: true })

    expect(screen.getByRole("status")).toHaveTextContent("Salvando…")
    expect(screen.getByRole("button", { name: "Publicar" })).toBeDisabled()
  })

  // Saved on the server a moment ago, not yet in the shop: nothing to discard here, something to publish.
  it("says the saved draft is not published, and offers Publicar with nothing arranged here", async () => {
    const { props } = renderBar({ unpublished: true })

    expect(screen.getByRole("status")).toHaveTextContent("Alterações não publicadas")
    await userEvent.click(screen.getByRole("button", { name: "Publicar" }))
    expect(props.onPublish).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("button", { name: "Descartar" })).not.toBeInTheDocument()
  })

  // A landing still a draft: Publicar is how it goes up, with or without anything arranged to send.
  it("says a landing is not up, and offers to put it up with nothing else to write", async () => {
    const { props } = renderBar({ pagePublished: false, pageName: "Black Friday", shopHref: null })

    expect(screen.getByRole("status")).toHaveTextContent("Página não publicada")
    await userEvent.click(screen.getByRole("button", { name: "Publicar página" }))
    expect(props.onPublish).toHaveBeenCalledTimes(1)
    // A page nobody is served has no address to open.
    expect(screen.queryByRole("link", { name: /Ver na loja/ })).not.toBeInTheDocument()
  })

  it("says why Publicar did not land, in the status's place", () => {
    renderBar({ pagePublished: false, publishError: "A página não foi publicada. Tente de novo." })

    expect(screen.getByRole("alert")).toHaveTextContent("A página não foi publicada. Tente de novo.")
  })

  it("draws the way to another page where the page's name is, and still titles the screen with it", () => {
    renderBar({ pageName: "Black Friday", pageSwitcher: <button type="button">Trocar</button> })

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Loja do Design/Black Friday")
    expect(screen.getByRole("button", { name: "Trocar" })).toBeInTheDocument()
  })

  it("switches the preview's device and opens the side columns as drawers", async () => {
    const { props } = renderBar()

    await userEvent.click(screen.getByRole("button", { name: "Celular" }))
    expect(props.onDeviceChange).toHaveBeenCalledWith("PHONE")
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
