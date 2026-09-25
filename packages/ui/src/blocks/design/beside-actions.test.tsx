// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { BesideActions } from "./beside-actions"

describe("BesideActions", () => {
  // In words and in sight: the hover-only "+" was the only way, and nobody found it.
  it("offers a block beside this one, named after it", async () => {
    const onAddBeside = vi.fn()
    render(<BesideActions name="Banner de verão" onAddBeside={onAddBeside} />)

    const button = screen.getByRole("button", { name: "Adicionar ao lado de Banner de verão" })
    expect(button).toHaveTextContent("Adicionar ao lado")
    await userEvent.click(button)

    expect(onAddBeside).toHaveBeenCalled()
  })

  it("moves a lone block up beside the block above, saying which", async () => {
    const onJoin = vi.fn()
    render(<BesideActions name="Banner 2" joinAbove={{ name: "Banner 1", onJoin }} />)

    await userEvent.click(screen.getByRole("button", { name: "Pôr ao lado de Banner 1" }))

    expect(onJoin).toHaveBeenCalled()
  })

  it("draws nothing when the row has no room and there is nothing above to join", () => {
    const { container } = render(<BesideActions name="Banner" />)

    expect(container).toBeEmptyDOMElement()
  })

  it("speaks the panel's language", () => {
    render(<BesideActions name="Banner" onAddBeside={vi.fn()} joinAbove={{ name: "Hero", onJoin: vi.fn() }} messages={en} />)

    expect(screen.getByRole("button", { name: "Add beside Banner" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Put beside Hero" })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<BesideActions name="Banner" onAddBeside={vi.fn()} joinAbove={{ name: "Hero", onJoin: vi.fn() }} />)

    await expectNoA11yViolations(container)
  })
})
