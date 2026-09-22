// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ArrangeBoard } from "./design-arrange"
import { DesignHandle } from "./design-handle"

function renderHandle() {
  return render(
    <ArrangeBoard ids={["1", "2"]} onReorder={vi.fn()} layout="grid">
      <ul>
        <li>
          <DesignHandle id="1" label="Coleção de inverno">
            <a href="/loja/inverno">Coleção de inverno</a>
          </DesignHandle>
        </li>
      </ul>
    </ArrangeBoard>,
  )
}

describe("DesignHandle", () => {
  it("names the grip after the thing it moves", () => {
    renderHandle()

    expect(screen.getByRole("button", { name: "Arrastar: Coleção de inverno" })).toBeInTheDocument()
  })

  it("keeps the grip out of the link it sits over", () => {
    renderHandle()

    // A button inside an anchor is invalid HTML that browsers repair by moving it out, and the
    // repaired tree is not the one dnd-kit attached its listeners to.
    const grip = screen.getByRole("button", { name: "Arrastar: Coleção de inverno" })

    expect(grip.closest("a")).toBeNull()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderHandle()

    await expectNoA11yViolations(container)
  })
})
