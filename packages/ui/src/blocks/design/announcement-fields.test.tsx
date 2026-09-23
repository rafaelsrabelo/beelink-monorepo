// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { sampleColorPresets as presets } from "../store/store.fixtures"
import { AnnouncementFields, type AnnouncementValue } from "./announcement-fields"

const page = presets[0]!.colors.background

function value(over: Partial<AnnouncementValue> = {}): AnnouncementValue {
  return { background: "", target: "NONE", categoryId: "", productId: "", externalUrl: "", ...over }
}

describe("AnnouncementFields", () => {
  it("asks for the strip's colour and where it leads, and nothing else", () => {
    render(<AnnouncementFields value={value()} onChange={vi.fn()} pageBackground={page} categories={[]} products={[]} />)

    expect(screen.getByRole("checkbox", { name: "Cor da barra" })).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Para onde leva" })).toBeInTheDocument()
    expect(screen.queryByLabelText("Título")).not.toBeInTheDocument()
  })

  it("hands a colour and a destination back as partial changes", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<AnnouncementFields value={value()} onChange={onChange} pageBackground={page} categories={[]} products={[]} />)

    await user.click(screen.getByRole("checkbox", { name: "Cor da barra" }))

    expect(onChange).toHaveBeenCalledWith({ background: page })
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <AnnouncementFields
        value={value({ background: presets[2]!.colors.primary, target: "CATEGORY", categoryId: "cat-1" })}
        onChange={vi.fn()}
        pageBackground={page}
        categories={[{ id: "cat-1", name: "Blusas" }]}
        products={[]}
      />,
    )

    await expectNoA11yViolations(container)
  })
})
