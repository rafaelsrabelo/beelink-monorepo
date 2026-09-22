// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ArrangeBoard, ArrangeScale, useArrangeItem } from "./design-arrange"

function Row({ id }: { id: string }) {
  const drag = useArrangeItem(id)

  return (
    <li ref={drag.setNodeRef} style={drag.style} data-testid={`row-${id}`}>
      <button type="button" aria-label={`Arrastar: ${id}`} {...drag.handleProps}>
        {id}
      </button>
    </li>
  )
}

function board(props: Partial<Parameters<typeof ArrangeBoard>[0]> = {}) {
  const onReorder = vi.fn()

  const view = render(
    <ArrangeBoard ids={["a", "b"]} onReorder={onReorder} {...props}>
      <ul>
        <Row id="a" />
        <Row id="b" />
      </ul>
    </ArrangeBoard>,
  )

  return { ...view, onReorder }
}

describe("ArrangeBoard", () => {
  it("makes every id it was given draggable", () => {
    board()

    // dnd-kit puts the role, the tab stop and the described-by on whatever the handle spreads.
    expect(screen.getByRole("button", { name: "Arrastar: a" })).toHaveAttribute("aria-roledescription", "sortable")
  })

  it("draws whatever it was handed, and decides nothing about it", () => {
    board()

    expect(screen.getByTestId("row-a")).toBeInTheDocument()
    expect(screen.getByTestId("row-b")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = board()

    await expectNoA11yViolations(container)
  })
})

describe("useArrangeItem", () => {
  // The correction the preview needs: dnd-kit translates inside the dragged element's own box, and
  // that box is painted down, so an uncorrected translate crawls at the scale's fraction of the
  // pointer. There is no drag here to measure, so what is asserted is that the scale reaches the
  // hook at all — the travel itself is measured in the browser.
  it("takes the scale from the surface it is drawn on", () => {
    const { container } = render(
      <ArrangeScale scale={0.5}>
        <ArrangeBoard ids={["a"]} onReorder={vi.fn()}>
          <ul>
            <Row id="a" />
          </ul>
        </ArrangeBoard>
      </ArrangeScale>,
    )

    expect(container.querySelector('[data-testid="row-a"]')).toBeInTheDocument()
  })
})
