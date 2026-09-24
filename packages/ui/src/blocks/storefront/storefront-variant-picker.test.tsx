// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontVariantPicker } from "./storefront-variant-picker"
import { BLOUSE_OPTIONS, BLOUSE_VARIANTS } from "./variant-choice-fixtures"

function renderPicker(onSelect = vi.fn()) {
  render(
    <StorefrontVariantPicker
      options={BLOUSE_OPTIONS}
      variants={BLOUSE_VARIANTS}
      selection={{ size: "P", colour: "areia" }}
      onSelect={onSelect}
    />,
  )
  return onSelect
}

describe("StorefrontVariantPicker", () => {
  it("names each option with the value chosen", () => {
    renderPicker()

    expect(screen.getByRole("group", { name: "Tamanho: P" })).toBeInTheDocument()
    expect(screen.getByRole("group", { name: "Cor: Areia" })).toBeInTheDocument()
  })

  it("disables a value no combination has, and says so", () => {
    renderPicker()

    expect(screen.getByRole("button", { name: "G, indisponível" })).toBeDisabled()
  })

  it("keeps a sold-out combination choosable, struck through and said out loud", async () => {
    const user = userEvent.setup()
    const onSelect = renderPicker()

    const medium = screen.getByRole("button", { name: "M, esgotado" })
    expect(medium).toBeEnabled()
    expect(medium).toHaveClass("line-through")
    await user.click(medium)

    expect(onSelect).toHaveBeenCalledWith("size", "M")
  })

  it("draws a colour's swatch beside its name, and has no accessibility violations", async () => {
    const { container } = render(
      <StorefrontVariantPicker options={BLOUSE_OPTIONS} variants={BLOUSE_VARIANTS} selection={{ size: "P", colour: "areia" }} onSelect={() => {}} />,
    )

    expect(screen.getByRole("button", { name: "Terracota" }).querySelector("span[aria-hidden]")).not.toBeNull()
    await expectNoA11yViolations(container)
  })
})
