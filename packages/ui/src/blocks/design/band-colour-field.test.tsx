// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { sampleColorPresets as presets } from "../store/store.fixtures"
import { BandColourField } from "./band-colour-field"

const page = presets[0]!.colors.background

describe("BandColourField", () => {
  it("says in words that there is no colour of its own, and shows no swatch", () => {
    render(
      <BandColourField id="strip" value="" onChange={vi.fn()} pageBackground={page} label="Cor da barra" noneLabel="A cor padrão" />,
    )

    expect(screen.getByRole("checkbox", { name: "Cor da barra" })).not.toBeChecked()
    expect(screen.getByText("A cor padrão")).toBeInTheDocument()
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
  })

  it("starts from the page's colour when switched on, and clears when switched off", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(
      <BandColourField id="strip" value="" onChange={onChange} pageBackground={page} label="Cor da barra" noneLabel="A cor padrão" />,
    )

    await user.click(screen.getByRole("checkbox", { name: "Cor da barra" }))
    expect(onChange).toHaveBeenCalledWith(page)

    rerender(
      <BandColourField id="strip" value={page} onChange={onChange} pageBackground={page} label="Cor da barra" noneLabel="A cor padrão" />,
    )
    await user.click(screen.getByRole("checkbox", { name: "Cor da barra" }))
    expect(onChange).toHaveBeenLastCalledWith("")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <BandColourField id="strip" value={page} onChange={vi.fn()} pageBackground={page} label="Cor da barra" noneLabel="A cor padrão" />,
    )

    await expectNoA11yViolations(container)
  })
})
