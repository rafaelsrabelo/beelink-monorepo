// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { TemplateAppliedNotice, type TemplateAppliedNoticeProps } from "./template-applied-notice"

function notice(over: Partial<TemplateAppliedNoticeProps> = {}) {
  const props: TemplateAppliedNoticeProps = { templateName: "Ofertas", problems: [], onPublish: vi.fn(), onDismiss: vi.fn(), ...over }
  return { props, ...render(<TemplateAppliedNotice {...props} />) }
}

describe("TemplateAppliedNotice", () => {
  it("says the model is in the draft and that the shop waits for Publicar", () => {
    notice()

    expect(screen.getByRole("status")).toHaveTextContent("Modelo Ofertas aplicado ao rascunho. A loja só muda quando você publicar.")
    expect(screen.queryByRole("list")).not.toBeInTheDocument()
  })

  it("lists what the model left to look at, in Publicar's own sentences", () => {
    notice({ problems: [{ kind: "SHOWCASE_EMPTY", blockName: "Todos os produtos", bandName: "Faixa 2" }] })

    expect(screen.getByText("Antes de publicar, confira:")).toBeInTheDocument()
    expect(within(screen.getByRole("list")).getByRole("listitem")).toHaveTextContent(
      "Todos os produtos, em Faixa 2: a vitrine não tem produtos para mostrar.",
    )
  })

  it("is a grey line while the page is being checked, and lists nothing when the check failed", () => {
    const { props, rerender } = notice({ problems: null })

    expect(screen.getByText("Conferindo a página…")).toBeInTheDocument()

    rerender(<TemplateAppliedNotice {...props} checkFailed />)
    expect(screen.queryByText("Conferindo a página…")).not.toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("Modelo Ofertas aplicado ao rascunho.")
  })

  it("offers Publicar, and to be put away", async () => {
    const { props } = notice()

    await userEvent.click(screen.getByRole("button", { name: "Publicar" }))
    await userEvent.click(screen.getByRole("button", { name: "Dispensar o aviso" }))

    expect(props.onPublish).toHaveBeenCalledTimes(1)
    expect(props.onDismiss).toHaveBeenCalledTimes(1)
  })

  it("speaks the reader's language", () => {
    notice({ messages: en, templateName: "Sales" })

    expect(screen.getByRole("status")).toHaveTextContent("The Sales template is now in the draft. The shop only changes when you publish.")
    expect(screen.getByRole("button", { name: "Dismiss the notice" })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = notice({ problems: [{ kind: "BANNER_WITHOUT_IMAGE", blockName: "Banner", bandName: "Faixa 1" }] })

    await expectNoA11yViolations(container)
  })
})
