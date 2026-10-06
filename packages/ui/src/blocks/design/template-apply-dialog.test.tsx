// Libs
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { TemplateApplyDialog, type TemplateApplyDialogProps } from "./template-apply-dialog"

function dialog(over: Partial<TemplateApplyDialogProps> = {}) {
  const props: TemplateApplyDialogProps = {
    templateName: "Ofertas",
    pageName: "Página inicial",
    unpublished: false,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...over,
  }
  return { props, ...render(<TemplateApplyDialog {...props} />) }
}

describe("TemplateApplyDialog", () => {
  it("is closed while no model is being asked about", () => {
    dialog({ templateName: null })

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })

  it("says the draft of the page is replaced and the published shop is not", async () => {
    dialog()

    const question = await screen.findByRole("alertdialog", { name: "Usar o modelo Ofertas?" })
    expect(question).toHaveTextContent("Tudo o que está no rascunho de Página inicial será substituído por este modelo.")
    expect(question).toHaveTextContent("A loja publicada continua igual até você publicar.")
    expect(question).not.toHaveTextContent("serão perdidas")
  })

  it("says the unpublished changes are lost only when there are some", async () => {
    dialog({ unpublished: true })

    expect(await screen.findByRole("alertdialog")).toHaveTextContent("As alterações que você ainda não publicou nesta página serão perdidas.")
  })

  // An Enter on the question must not replace the draft.
  it("starts with the focus on Cancelar", async () => {
    const { props } = dialog()

    await screen.findByRole("alertdialog")
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus())
    await userEvent.keyboard("{Enter}")
    expect(props.onCancel).toHaveBeenCalledTimes(1)
    expect(props.onConfirm).not.toHaveBeenCalled()
  })

  it("applies only when told to", async () => {
    const { props } = dialog()

    await userEvent.click(await screen.findByRole("button", { name: "Usar modelo" }))
    expect(props.onConfirm).toHaveBeenCalledTimes(1)
    expect(props.onCancel).not.toHaveBeenCalled()
  })

  it("waits while the model is being applied: neither button, nor Escape", async () => {
    const { props } = dialog({ applying: true })

    await screen.findByRole("alertdialog")
    expect(screen.getByRole("button", { name: "Aplicando…" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled()
    await userEvent.keyboard("{Escape}")
    expect(props.onCancel).not.toHaveBeenCalled()
  })

  it("says why the API refused, and stays open", async () => {
    dialog({ error: "Esse produto não é desta loja. Escolha outro." })

    expect(await screen.findByRole("alert")).toHaveTextContent("Esse produto não é desta loja. Escolha outro.")
    expect(screen.getByRole("button", { name: "Usar modelo" })).toBeEnabled()
  })

  it("speaks the reader's language", async () => {
    dialog({ messages: en, templateName: "Sales", pageName: "Home", unpublished: true })

    const question = await screen.findByRole("alertdialog", { name: "Use the Sales template?" })
    expect(question).toHaveTextContent("The published shop stays as it is until you publish.")
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    dialog({ unpublished: true, error: "Esse modelo não está disponível para esta loja." })

    await expectNoA11yViolations(await screen.findByRole("alertdialog"))
  })
})
