// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { DesignBesideSlot } from "./design-beside-slot"

describe("DesignBesideSlot", () => {
  it("is the room a row has left, as a button that says what goes there", async () => {
    const onAdd = vi.fn()
    render(<DesignBesideSlot name="Banner de verão" onAdd={onAdd} />)

    const slot = screen.getByRole("button", { name: "Adicionar ao lado de Banner de verão" })
    expect(slot).toHaveTextContent("Adicionar ao lado")
    await userEvent.click(slot)

    expect(onAdd).toHaveBeenCalled()
  })

  // The preview makes the shop's own links inert from above; this click must not reach that handler.
  it("keeps its click to itself", async () => {
    const outside = vi.fn()
    render(
      <div onClick={outside}>
        <DesignBesideSlot name="Banner" onAdd={vi.fn()} />
      </div>,
    )

    await userEvent.click(screen.getByRole("button"))

    expect(outside).not.toHaveBeenCalled()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<DesignBesideSlot name="Banner" onAdd={vi.fn()} />)

    await expectNoA11yViolations(container)
  })
})
