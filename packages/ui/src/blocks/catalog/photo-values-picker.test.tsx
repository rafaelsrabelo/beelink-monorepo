// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { PhotoValuesPicker, photoValuesSummary } from "./photo-values-picker"
import { WHEY } from "./variation-fixtures"

describe("PhotoValuesPicker", () => {
  it("says what the photo is of, option by option, or that it is of every variation", () => {
    expect(photoValuesSummary(WHEY.options, [], "Todas as variações")).toBe("Todas as variações")
    expect(photoValuesSummary(WHEY.options, ["Morango", "900g"], "Todas")).toBe("900g · Morango")
    expect(photoValuesSummary(WHEY.options, ["Chocolate", "Morango"], "Todas")).toBe("Chocolate, Morango")
  })

  it("names the photo and what it is of on its button", () => {
    render(<PhotoValuesPicker options={WHEY.options} value={["Morango"]} onChange={() => {}} number={2} />)

    expect(screen.getByRole("button", { name: "Foto 2 aparece em: Morango. Alterar" })).toBeInTheDocument()
  })

  it("marks a value, and takes an option's marks off with its any-value button", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<PhotoValuesPicker options={WHEY.options} value={["Morango"]} onChange={onChange} number={2} />)

    await user.click(screen.getByRole("button", { name: /Foto 2/ }))
    const weight = screen.getByRole("group", { name: "Peso" })

    // Nothing of Peso is marked, so "any weight" is the one pressed.
    expect(screen.getByRole("button", { name: "Qualquer peso" })).toHaveAttribute("aria-pressed", "true")
    await user.click(within(weight).getByRole("button", { name: "900g" }))
    expect(onChange).toHaveBeenLastCalledWith(["Morango", "900g"])

    await user.click(screen.getByRole("button", { name: "Qualquer sabor" }))
    expect(onChange).toHaveBeenLastCalledWith([])
  })

  it("has no accessibility violations, open", async () => {
    const user = userEvent.setup()
    render(<PhotoValuesPicker options={WHEY.options} value={["Morango"]} onChange={() => {}} number={2} />)

    await user.click(screen.getByRole("button", { name: /Foto 2/ }))
    await expectNoA11yViolations(document.body)
  })
})
