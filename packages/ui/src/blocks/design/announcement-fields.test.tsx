// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { AnnouncementFields, type AnnouncementValue } from "./announcement-fields"

function value(over: Partial<AnnouncementValue> = {}): AnnouncementValue {
  return { target: "NONE", categoryId: "", productId: "", externalUrl: "", ...over }
}

describe("AnnouncementFields", () => {
  // The strip's colour is its band's, and moved to the Estilo tab with every band's.
  it("asks where the strip leads, and no colour", () => {
    render(<AnnouncementFields value={value()} onChange={vi.fn()} categories={[]} products={[]} />)

    expect(screen.getByRole("combobox", { name: "Para onde leva" })).toBeInTheDocument()
    expect(screen.queryByRole("checkbox", { name: "Cor da barra" })).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Título")).not.toBeInTheDocument()
  })

  it("hands a destination back as a partial change", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<AnnouncementFields value={value({ target: "EXTERNAL" })} onChange={onChange} categories={[]} products={[]} />)

    await user.type(screen.getByRole("textbox"), "h")

    expect(onChange).toHaveBeenCalledWith({ externalUrl: "h" })
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <AnnouncementFields
        value={value({ target: "CATEGORY", categoryId: "cat-1" })}
        onChange={vi.fn()}
        categories={[{ id: "cat-1", name: "Blusas" }]}
        products={[]}
      />,
    )

    await expectNoA11yViolations(container)
  })
})
