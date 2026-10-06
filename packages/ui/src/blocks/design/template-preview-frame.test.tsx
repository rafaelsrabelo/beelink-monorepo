// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { TemplatePreviewFrame, type TemplatePreviewState } from "./template-preview-frame"

describe("TemplatePreviewFrame", () => {
  it("is a skeleton, said to a screen reader, while the preview is on its way", () => {
    render(<TemplatePreviewFrame state="loading" />)

    expect(screen.getByRole("status")).toHaveTextContent("Carregando a prévia")
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true")
  })

  it("draws the model inert once it is there, capped to a card's height", () => {
    render(
      <TemplatePreviewFrame state="ready">
        <a href="#x">Comprar</a>
      </TemplatePreviewFrame>,
    )

    const drawing = screen.getByText("Comprar").parentElement!
    expect(drawing).toHaveAttribute("inert")
    expect(drawing).toHaveAttribute("aria-hidden", "true")
    expect(drawing.className).toContain("max-h-56")
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("draws it whole, uncapped, beside the list", () => {
    render(
      <TemplatePreviewFrame state="ready" size="large">
        <p>Página</p>
      </TemplatePreviewFrame>,
    )

    expect(screen.getByText("Página").parentElement!.className).not.toContain("max-h-56")
  })

  it("says why it failed in the screen's words when it has them, and its own otherwise", async () => {
    const onRetry = vi.fn()
    const { rerender } = render(<TemplatePreviewFrame state="failed" onRetry={onRetry} />)
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar esta prévia.")

    rerender(<TemplatePreviewFrame state="failed" error="Esse produto não é desta loja." onRetry={onRetry} />)
    expect(screen.getByRole("alert")).toHaveTextContent("Esse produto não é desta loja.")

    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it("asks for a product, or says there is no preview, without a retry: asking again would answer the same", () => {
    const { rerender } = render(<TemplatePreviewFrame state="needsProduct" onRetry={vi.fn()} />)
    expect(screen.getByText("Escolha um produto para ver a prévia.")).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()

    rerender(<TemplatePreviewFrame state="unavailable" />)
    expect(screen.getByText("Este modelo ainda não tem prévia aqui.")).toBeInTheDocument()
  })

  it.each<TemplatePreviewState>(["loading", "failed", "needsProduct", "unavailable", "ready"])("has no accessibility violations when %s", async (state) => {
    const { container } = render(
      <TemplatePreviewFrame state={state} onRetry={vi.fn()}>
        <p>Página</p>
      </TemplatePreviewFrame>,
    )

    await expectNoA11yViolations(container)
  })
})
