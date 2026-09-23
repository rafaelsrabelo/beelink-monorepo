// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { sampleColorPresets as presets } from "../store/store.fixtures"
import { BandForm } from "./band-form"

const page = presets[0]!.colors.background

describe("BandForm", () => {
  it("says the band has the page's colour, in words, when it has none of its own", () => {
    render(
      <BandForm
        value={{ width: "CONTAINED", background: "" }}
        onChange={vi.fn()}
        pageBackground={page}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByRole("checkbox", { name: "Cor de fundo da faixa" })).not.toBeChecked()
    expect(screen.getByText("A cor da página")).toBeInTheDocument()
  })

  /**
   * "The page's colour" and "white" are the same swatch and different things. Turning the colour
   * on starts from the page's, so the shopkeeper sees a swatch that is visibly a choice.
   */
  it("starts a band's own colour from the page's when the switch is turned on", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <BandForm
        value={{ width: "CONTAINED", background: "" }}
        onChange={onChange}
        pageBackground={page}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    await user.click(screen.getByRole("checkbox", { name: "Cor de fundo da faixa" }))

    expect(onChange).toHaveBeenCalledWith({ width: "CONTAINED", background: page })
  })

  /** The strip's band is drawn above the header, edge to edge; "ponta a ponta" there is a lie. */
  it("skips the width when told the band is not drawn where it sits", () => {
    render(
      <BandForm
        value={{ width: "CONTAINED", background: "" }}
        onChange={vi.fn()}
        widthEditable={false}
        pageBackground={page}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.queryByRole("combobox", { name: "Largura" })).not.toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: "Cor de fundo da faixa" })).toBeInTheDocument()
  })

  it("offers no text colour at all", () => {
    render(
      <BandForm
        value={{ width: "FULL", background: presets[1]!.colors.header }}
        onChange={vi.fn()}
        pageBackground={page}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    // Whatever is written on a band is derived from the band's colour. A picker for the text would
    // be a control able to write black on black, which was a state a shopkeeper could reach once.
    expect(screen.queryByLabelText(/texto/i)).not.toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <BandForm
        value={{ width: "FULL", background: presets[1]!.colors.header }}
        onChange={vi.fn()}
        pageBackground={page}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    await expectNoA11yViolations(container)
  })
})
