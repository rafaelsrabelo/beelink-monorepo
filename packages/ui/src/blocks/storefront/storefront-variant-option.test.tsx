// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// UI
import type { ChoiceOption } from "@harness-monorepo/ui/lib/variant-choice"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontVariantOption, type StorefrontVariantOptionProps } from "./storefront-variant-option"

const FLAVOUR: ChoiceOption = {
  id: "sabor",
  name: "Sabor",
  values: [
    { id: "frutas", name: "Frutas vermelhas", colorHex: null },
    { id: "uva", name: "Uva", colorHex: null },
    { id: "maca", name: "Maçã verde", colorHex: null },
    { id: "coco", name: "Coco", colorHex: null },
  ],
}

function renderOption(over: Partial<StorefrontVariantOptionProps> = {}) {
  const onSelect = vi.fn()
  const view = render(
    <StorefrontVariantOption
      option={FLAVOUR}
      states={["available", "available", "soldOut", "missing"]}
      prices={["R$ 119,90", "R$ 129,90", "R$ 119,90", "R$ 99,90"]}
      photos={["https://cdn/frutas.jpg", null, "https://cdn/maca.jpg", null]}
      chosenId="frutas"
      layout="cards"
      onSelect={onSelect}
      {...over}
    />,
  )
  return { onSelect, ...view }
}

describe("StorefrontVariantOption", () => {
  it("names the row with the option and the value chosen, the value in bold", () => {
    renderOption()

    expect(screen.getByRole("group", { name: "Sabor: Frutas vermelhas" })).toBeInTheDocument()
    expect(screen.getByText("Frutas vermelhas", { selector: "strong" })).toBeInTheDocument()
  })

  it("draws a card per value with its photo, its name and its price", () => {
    renderOption()

    const chosen = screen.getByRole("button", { name: "Frutas vermelhas, R$ 119,90" })
    expect(chosen).toHaveAttribute("aria-pressed", "true")
    expect(chosen).toHaveClass("border-2", "border-shop-primary-ink", "bg-shop-primary-tint")
    expect(chosen.querySelector("img")).toHaveAttribute("src", "https://cdn/frutas.jpg")
    expect(within(chosen).getByText("Frutas vermelhas")).toHaveClass("font-bold")
    expect(within(screen.getByRole("button", { name: "Uva, R$ 129,90" })).getByText("Uva")).toHaveClass("font-semibold")
  })

  it("keeps a sold-out value choosable, dashed, faded and saying 'Esgotado · avise-me'", async () => {
    const user = userEvent.setup()
    const { onSelect } = renderOption()

    const sold = screen.getByRole("button", { name: "Maçã verde, R$ 119,90, esgotado" })
    expect(sold).toBeEnabled()
    expect(sold).toHaveClass("border-dashed", "text-shop-muted")
    expect(sold).toHaveTextContent("Esgotado · avise-me")
    expect(sold.querySelector("img")).toHaveClass("opacity-50")
    await user.click(sold)

    expect(onSelect).toHaveBeenCalledWith("maca")
  })

  it("disables a value no combination reaches, and gives it no price", () => {
    renderOption()

    const missing = screen.getByRole("button", { name: "Coco, indisponível" })
    expect(missing).toBeDisabled()
    expect(missing).not.toHaveTextContent("R$")
  })

  it("draws pills, with no swatch, for an option without photos or colours", () => {
    renderOption({ layout: "pills", photos: [null, null, null, null] })

    const pill = screen.getByRole("button", { name: "Uva, R$ 129,90" })
    expect(pill).toHaveClass("min-w-[110px]")
    expect(pill.querySelector("span[aria-hidden]")).toBeNull()
  })

  it("does not report choosing the value already chosen again", async () => {
    const user = userEvent.setup()
    const { onSelect } = renderOption()

    await user.click(screen.getByRole("button", { name: "Frutas vermelhas, R$ 119,90" }))

    expect(onSelect).not.toHaveBeenCalled()
  })

  it("is one tab stop, walked with the arrows, skipping a value no combination reaches", async () => {
    const user = userEvent.setup()
    const { onSelect } = renderOption()

    await user.tab()
    expect(screen.getByRole("button", { name: "Frutas vermelhas, R$ 119,90" })).toHaveFocus()

    await user.keyboard("{ArrowRight}")
    expect(screen.getByRole("button", { name: "Uva, R$ 129,90" })).toHaveFocus()
    await user.keyboard("{ArrowRight}")
    expect(screen.getByRole("button", { name: "Maçã verde, R$ 119,90, esgotado" })).toHaveFocus()
    await user.keyboard(" ")
    expect(onSelect).toHaveBeenCalledWith("maca")

    // Coco is disabled, so the next arrow wraps round to the first value.
    await user.keyboard("{ArrowRight}")
    expect(screen.getByRole("button", { name: "Frutas vermelhas, R$ 119,90" })).toHaveFocus()
  })

  it("has no accessibility violations, as cards or as pills", async () => {
    const { container, unmount } = renderOption()
    await expectNoA11yViolations(container)
    unmount()

    const pills = renderOption({ layout: "pills" })
    await expectNoA11yViolations(pills.container)
  })
})
