// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { sampleColorPresets as presets } from "../store/store.fixtures"
import { BandStyleFields } from "./band-style-fields"

const page = presets[0]!.colors.background

describe("BandStyleFields", () => {
  it("says the band has the page's colour, in words, when it has none of its own", () => {
    render(<BandStyleFields value={{ name: "", width: "CONTAINED", background: "" }} onChange={vi.fn()} pageBackground={page} />)

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
    render(<BandStyleFields value={{ name: "", width: "CONTAINED", background: "" }} onChange={onChange} pageBackground={page} />)

    await user.click(screen.getByRole("checkbox", { name: "Cor de fundo da faixa" }))

    expect(onChange).toHaveBeenCalledWith({ name: "", width: "CONTAINED", background: page })
  })

  /** The strip's band is drawn above the header, edge to edge; "ponta a ponta" there is a lie. */
  it("asks the strip's band for its colour alone, in the strip's words", () => {
    render(<BandStyleFields value={{ name: "", width: "CONTAINED", background: "" }} onChange={vi.fn()} strip pageBackground={page} />)

    expect(screen.queryByRole("combobox", { name: "Largura" })).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Nome da faixa")).not.toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: "Cor da barra" })).toBeInTheDocument()
    expect(screen.getByText(/Só a cor se escolhe aqui/)).toBeInTheDocument()
  })

  // Chosen from one of its blocks, the band's colour is every block's — said before it is changed.
  it("says the style is every block's when the band holds several", () => {
    const { rerender } = render(
      <BandStyleFields value={{ name: "", width: "FULL", background: "" }} onChange={vi.fn()} sharedWith={3} pageBackground={page} />,
    )
    expect(screen.getByText("Vale para os 3 blocos desta faixa.")).toBeInTheDocument()

    rerender(<BandStyleFields value={{ name: "", width: "FULL", background: "" }} onChange={vi.fn()} sharedWith={1} pageBackground={page} />)
    expect(screen.queryByText(/Vale para os/)).not.toBeInTheDocument()
  })

  it("offers no text colour and no spacing at all", () => {
    render(<BandStyleFields value={{ name: "Sobre", width: "FULL", background: presets[1]!.colors.header }} onChange={vi.fn()} pageBackground={page} />)

    // Whatever is written on a band is derived from the band's colour. A picker for the text would
    // be a control able to write black on black, which was a state a shopkeeper could reach once.
    expect(screen.queryByLabelText(/texto/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/espaçamento/i)).not.toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <BandStyleFields
        value={{ name: "Sobre", width: "FULL", background: presets[1]!.colors.header }}
        onChange={vi.fn()}
        sharedWith={2}
        pageBackground={page}
      />,
    )

    await expectNoA11yViolations(container)
  })
})
