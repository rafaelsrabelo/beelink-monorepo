// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { PageSettingsDialog, type PageSettingsDialogProps, type PageSettingsValue } from "./page-settings-dialog"

const initial: PageSettingsValue = {
  title: "Lançamento",
  slug: "lancamento",
  display: { inMenu: false, usesChrome: true },
  seo: { title: "", description: "", imageUrl: "" },
}

function Harness(props: Partial<PageSettingsDialogProps>) {
  const [value, setValue] = useState(initial)
  return (
    <PageSettingsDialog
      open
      onOpenChange={vi.fn()}
      value={value}
      onChange={setValue}
      addressPrefix="/mutante/lp/"
      addressState="idle"
      onSubmit={vi.fn()}
      pending={false}
      {...props}
    />
  )
}

describe("PageSettingsDialog", () => {
  it("edits the name, the address, the frame and the search words, and saves them as one", async () => {
    const onSubmit = vi.fn()
    render(<Harness onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText("Nome da página"), " Whey")
    await userEvent.click(screen.getByRole("switch", { name: "Mostrar no menu da loja" }))
    await userEvent.type(screen.getByLabelText("Título na busca"), "Whey em oferta")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText("Nome da página")).toHaveValue("Lançamento Whey")
  })

  it("will not save an empty name, or an address another page holds", async () => {
    const { rerender } = render(<Harness addressState="taken" />)
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled()

    rerender(<Harness />)
    await userEvent.clear(screen.getByLabelText("Nome da página"))
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled()
  })

  it("has no accessibility violations", async () => {
    render(<Harness />)

    await expectNoA11yViolations(await screen.findByRole("dialog"))
  })
})
