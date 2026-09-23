// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { LeadStatusSelect } from "./lead-status-select"

describe("LeadStatusSelect", () => {
  it("shows the current status under the name it was given", () => {
    render(<LeadStatusSelect value="CONTACTED" onChange={vi.fn()} label="Status de Carlos" />)

    expect(screen.getByRole("combobox", { name: "Status de Carlos" })).toHaveTextContent("Em conversa")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<LeadStatusSelect value="NEW" onChange={vi.fn()} label="Status de Carlos" />)

    await expectNoA11yViolations(container)
  })
})
