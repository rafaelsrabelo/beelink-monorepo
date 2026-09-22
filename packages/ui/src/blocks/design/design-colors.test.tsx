// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import palettes from "../store/store-palettes.json"
import { DesignColors } from "./design-colors"

/**
 * The colours come from the sample palettes, not from literals here. `web/no-hex-colors` scans
 * this package at an absolute zero baseline and is right to — `store-palettes.json` holds them
 * for exactly this reason, and says so in its own comment.
 */
const [first, second] = palettes.presets
const value = first!.colors

describe("DesignColors", () => {
  it("offers the three surfaces and the brand", () => {
    render(<DesignColors value={value} onChange={vi.fn()} />)

    expect(screen.getByLabelText("Cor de fundo")).toBeInTheDocument()
    expect(screen.getByLabelText("Cor principal")).toBeInTheDocument()
    expect(screen.getByLabelText("Cor do topo")).toBeInTheDocument()
    expect(screen.getByLabelText("Cor do rodapé")).toBeInTheDocument()
  })

  // The control that could write black on black. Every word on the shop window is derived from
  // what it sits on, so there is nothing here to pick.
  it("offers no ink", () => {
    render(<DesignColors value={value} onChange={vi.fn()} />)

    expect(screen.queryByLabelText("Cor do texto")).not.toBeInTheDocument()
  })

  it("says why, rather than leaving the absence to be noticed", () => {
    render(<DesignColors value={value} onChange={vi.fn()} />)

    expect(screen.getByText(/A cor do texto é escolhida sozinha/)).toBeInTheDocument()
  })

  it("applies a whole palette in one press", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const preset = { id: "verde", name: "Verde", colors: second!.colors }

    render(<DesignColors value={value} onChange={onChange} presets={[preset]} />)
    await user.click(screen.getByRole("button", { name: "Verde" }))

    expect(onChange).toHaveBeenCalledWith(preset.colors)
  })

  it("has nothing to save until something changed", () => {
    render(<DesignColors value={value} onChange={vi.fn()} onSave={vi.fn()} dirty={false} />)

    expect(screen.getByRole("button", { name: "Salvar cores" })).toBeDisabled()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <DesignColors
        value={value}
        onChange={vi.fn()}
        presets={[{ id: "verde", name: "Verde", colors: value }]}
        onSave={vi.fn()}
        dirty
      />,
    )

    await expectNoA11yViolations(container)
  })
})
