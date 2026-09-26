// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { LayoutPicker } from "./layout-picker"
import { LayoutThumbnail } from "./layout-thumbnail"

function picker(onChange = vi.fn(), messages = undefined as typeof en | undefined) {
  render(
    <LayoutPicker
      layouts={["INLINE", "CARDS"]}
      value="INLINE"
      onChange={onChange}
      label="Trocar layout de Vantagens"
      trigger={<button type="button">Trocar layout</button>}
      {...(messages ? { messages } : {})}
    />,
  )
  return onChange
}

describe("LayoutPicker", () => {
  it("draws and names each layout, the one in use pressed, and picks with one press", async () => {
    const onChange = picker()

    await userEvent.click(screen.getByRole("button", { name: "Trocar layout" }))
    const group = await screen.findByRole("group", { name: "Trocar layout de Vantagens" })
    expect(within(group).getByRole("button", { name: "Em linha" })).toHaveAttribute("aria-pressed", "true")
    await userEvent.click(within(group).getByRole("button", { name: "Cartões" }))

    expect(onChange).toHaveBeenCalledWith("CARDS")
    expect(screen.queryByRole("group", { name: "Trocar layout de Vantagens" })).not.toBeInTheDocument()
  })

  it("speaks the panel's language", async () => {
    picker(vi.fn(), en)

    await userEvent.click(screen.getByRole("button", { name: "Trocar layout" }))
    expect(await screen.findByRole("button", { name: "Cards" })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    picker()
    await userEvent.click(screen.getByRole("button", { name: "Trocar layout" }))

    await expectNoA11yViolations(await screen.findByRole("group", { name: "Trocar layout de Vantagens" }))
  })
})

describe("LayoutThumbnail", () => {
  // Decorative: the picker says each layout's name beside its drawing.
  it("is hidden from assistive technology", () => {
    const { container } = render(<LayoutThumbnail display="SPLIT" />)

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true")
  })
})
