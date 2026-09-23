// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { AddBlockMenu } from "./add-block-menu"

/**
 * Opened with `findByRole`, never `getByRole`: this menu mounts its items asynchronously, which is
 * the same thing `admin-store-menu.test.tsx` had to do. Wrapped in a `<nav>` for the reason that
 * file also states — without a landmark, axe reports "all page content should be contained by
 * landmarks" the moment it scans an open menu from the body, which is true about the harness and
 * says nothing about this block.
 */
async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Adicionar bloco/ }))
  await screen.findByRole("menu")
}

describe("AddBlockMenu", () => {
  it("offers every kind that can be created empty and filled in place", async () => {
    const user = userEvent.setup()
    render(<AddBlockMenu onAdd={vi.fn()} />)

    await open(user)

    expect(screen.getByRole("menuitem", { name: "Título" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Parágrafo" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Vantagens" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Barra de aviso" })).toBeInTheDocument()
  })

  /**
   * The one this menu used to refuse, and refusing it was the bug: a banner was made on a screen
   * of its own, so the thing the shopkeeper most wanted to add was the thing this would not add.
   * A heading and a paragraph are two entries rather than one with a mode, which is what was
   * asked for in those words.
   */
  it("offers a banner, and a heading apart from a paragraph", async () => {
    const user = userEvent.setup()
    render(<AddBlockMenu onAdd={vi.fn()} />)

    await open(user)

    expect(screen.getByRole("menuitem", { name: "Banner" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Título" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Parágrafo" })).toBeInTheDocument()
  })

  it("stops offering a block the shop already has one of", async () => {
    const user = userEvent.setup()
    render(<AddBlockMenu onAdd={vi.fn()} taken={["ANNOUNCEMENT"]} />)

    await open(user)

    expect(screen.queryByRole("menuitem", { name: "Barra de aviso" })).not.toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Título" })).toBeInTheDocument()
  })

  it("says which kind was chosen", async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    render(<AddBlockMenu onAdd={onAdd} />)

    await open(user)
    await user.click(screen.getByRole("menuitem", { name: "Título" }))

    expect(onAdd).toHaveBeenCalledWith("HEADING")
  })

  it("draws no control at all when there is nothing left to add", () => {
    const { container } = render(
      <AddBlockMenu onAdd={vi.fn()} taken={["BANNER", "HEADING", "TEXT", "BENEFITS", "CATEGORIES", "ANNOUNCEMENT"]} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it("has no accessibility violations, opened", async () => {
    // Opened, because a menu nobody opened in a test is a menu nobody has checked.
    const user = userEvent.setup()
    const { container } = render(
      <nav>
        <AddBlockMenu onAdd={vi.fn()} />
      </nav>,
    )

    await open(user)

    await expectNoA11yViolations(container)
  })
})
