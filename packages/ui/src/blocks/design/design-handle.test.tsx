// React
import type { ReactNode } from "react"

// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ArrangeBoard } from "./design-arrange"
import { DesignHandle } from "./design-handle"

function renderHandle(chosen: { selected?: boolean; bar?: ReactNode } = {}) {
  return render(
    <ArrangeBoard ids={["1", "2"]} onReorder={vi.fn()} layout="grid">
      <ul>
        <li>
          <DesignHandle id="1" label="Coleção de inverno" {...chosen}>
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

  // A band of several blocks, chosen by its header, carries its own actions over its corner.
  it("draws the chosen band's bar, and none while it is not chosen", () => {
    const bar = <button type="button">Subir Faixa 1</button>
    const { rerender } = renderHandle({ bar })
    expect(screen.queryByRole("button", { name: "Subir Faixa 1" })).not.toBeInTheDocument()

    rerender(
      <ArrangeBoard ids={["1", "2"]} onReorder={vi.fn()} layout="grid">
        <DesignHandle id="1" label="Coleção de inverno" selected bar={bar}>
          <p>faixa</p>
        </DesignHandle>
      </ArrangeBoard>,
    )
    expect(screen.getByRole("button", { name: "Subir Faixa 1" })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderHandle()

    await expectNoA11yViolations(container)
  })
})
