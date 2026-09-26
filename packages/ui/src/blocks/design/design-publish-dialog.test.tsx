// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { DesignPublishDialog, type DesignPublishDialogProps } from "./design-publish-dialog"

function renderDialog(overrides: Partial<DesignPublishDialogProps> = {}) {
  const props: DesignPublishDialogProps = {
    open: true,
    onOpenChange: vi.fn(),
    pageName: "Página inicial",
    problems: [],
    note: "",
    onNoteChange: vi.fn(),
    onPublish: vi.fn(),
    publishing: false,
    ...overrides,
  }
  return { ...render(<DesignPublishDialog {...props} />), props }
}

describe("DesignPublishDialog", () => {
  it("says there is nothing to review, and publishes", async () => {
    const { props } = renderDialog()

    expect(await screen.findByRole("dialog", { name: "Publicar Página inicial" })).toBeInTheDocument()
    expect(screen.getByText(/Nada a revisar/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Publicar" }))
    expect(props.onPublish).toHaveBeenCalledTimes(1)
  })

  it("names each problem by its block and band, and still lets the owner publish", async () => {
    const { props } = renderDialog({
      problems: [
        { kind: "SHOWCASE_EMPTY", blockName: "Mais vendidos", bandName: "Faixa 3" },
        { kind: "LINK_TO_MISSING_PRODUCT", blockName: "Banner", bandName: "Faixa 1" },
      ],
    })

    const items = await screen.findAllByRole("listitem")
    expect(items[0]).toHaveTextContent("Mais vendidos, em Faixa 3: a vitrine não tem produtos para mostrar.")
    expect(items[1]).toHaveTextContent("Banner, em Faixa 1: um link leva a um produto que não existe mais.")
    await userEvent.click(screen.getByRole("button", { name: "Publicar mesmo assim" }))
    expect(props.onPublish).toHaveBeenCalledTimes(1)
  })

  it("waits for the check before it lets the page go up, and says it is checking", async () => {
    renderDialog({ problems: null })

    expect(await screen.findByRole("status")).toHaveTextContent("Conferindo a página…")
    expect(screen.getByRole("button", { name: "Publicar" })).toBeDisabled()
  })

  it("says when the check failed rather than that the page is clean, and lets the owner ask again or publish", async () => {
    const onRetryCheck = vi.fn()
    const { props } = renderDialog({ problems: null, checkFailed: true, onRetryCheck })

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível conferir a página.")
    expect(screen.queryByText(/Nada a revisar/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Conferir de novo" }))
    expect(onRetryCheck).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole("button", { name: "Publicar mesmo assim" }))
    expect(props.onPublish).toHaveBeenCalledTimes(1)
  })

  it("cannot be closed while the page is going up", async () => {
    const { props } = renderDialog({ publishing: true })

    expect(await screen.findByRole("button", { name: "Cancelar" })).toBeDisabled()
    await userEvent.keyboard("{Escape}")
    expect(props.onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("hands the note back and says why a publish failed", async () => {
    const { props } = renderDialog({ error: "A página não foi publicada. Tente de novo." })

    await userEvent.type(await screen.findByLabelText("Nota para o histórico (opcional)"), "B")
    expect(props.onNoteChange).toHaveBeenLastCalledWith("B")
    expect(screen.getByRole("alert")).toHaveTextContent("A página não foi publicada")
  })

  it("has no accessibility violations", async () => {
    renderDialog({ problems: [{ kind: "BANNER_WITHOUT_IMAGE", blockName: "Banner", bandName: "Faixa 5" }] })

    await expectNoA11yViolations(await screen.findByRole("dialog"))
  })
})
