// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { VariationPresets } from "./variation-presets"

describe("VariationPresets", () => {
  it("adds a preset by its name, and Outra with no name for the shopkeeper to write", async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    render(<VariationPresets taken={[]} full={false} onAdd={onAdd} />)

    await user.click(screen.getByRole("button", { name: "Cor" }))
    await user.click(screen.getByRole("button", { name: "Outra" }))

    expect(onAdd.mock.calls).toEqual([
      ["color", "Cor"],
      ["other", ""],
    ])
  })

  it("does not offer a preset twice, whatever its case", () => {
    render(<VariationPresets taken={[" tamanho "]} full={false} onAdd={() => {}} />)

    expect(screen.getByRole("button", { name: "Tamanho" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Outra" })).toBeEnabled()
  })

  it("stops at three options and says why", async () => {
    const { container } = render(<VariationPresets taken={["A", "B", "C"]} full onAdd={() => {}} />)

    expect(screen.getByRole("button", { name: "Outra" })).toBeDisabled()
    expect(screen.getByText("Um produto tem no máximo 3 opções.")).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })
})
