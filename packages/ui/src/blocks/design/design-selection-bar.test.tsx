// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { DesignSelectionBar, type DesignSelectionBarProps } from "./design-selection-bar"

function bar(over: Partial<DesignSelectionBarProps> = {}) {
  const props: DesignSelectionBarProps = {
    label: "Banner 1",
    canMoveUp: true,
    canMoveDown: true,
    onMoveUp: vi.fn(),
    onMoveDown: vi.fn(),
    onToggleHidden: vi.fn(),
    onDelete: vi.fn(),
    ...over,
  }
  const { container } = render(<DesignSelectionBar {...props} />)
  return { ...props, container }
}

describe("DesignSelectionBar", () => {
  // Read aloud, a row of "Subir" says nothing about which: every button names what it acts on.
  it("names each action after what it acts on, as one toolbar", async () => {
    const props = bar()

    expect(screen.getByRole("toolbar", { name: "Ações de Banner 1" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Subir Banner 1" }))
    await userEvent.click(screen.getByRole("button", { name: "Descer Banner 1" }))
    await userEvent.click(screen.getByRole("button", { name: "Ocultar Banner 1" }))
    await userEvent.click(screen.getByRole("button", { name: "Excluir Banner 1" }))

    expect(props.onMoveUp).toHaveBeenCalled()
    expect(props.onMoveDown).toHaveBeenCalled()
    expect(props.onToggleHidden).toHaveBeenCalled()
    expect(props.onDelete).toHaveBeenCalled()
  })

  // A copy waits for the one on its way, so a double press is one copy and not two.
  it("duplicates, once at a time, and not on the strip", async () => {
    const onDuplicate = vi.fn()
    bar({ onDuplicate })
    await userEvent.click(screen.getByRole("button", { name: "Duplicar Banner 1" }))
    expect(onDuplicate).toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Duplicar Banner 1" })).toHaveAttribute("aria-keyshortcuts", "Control+D Meta+D")
  })

  it("waits for a copy on its way, and offers none where there may not be one", () => {
    bar({ onDuplicate: vi.fn(), duplicating: true })
    expect(screen.getByRole("button", { name: "Duplicar Banner 1" })).toBeDisabled()
  })

  it("says the keys that do the same", () => {
    bar()

    expect(screen.getByRole("button", { name: "Subir Banner 1" })).toHaveAttribute("aria-keyshortcuts", "Alt+ArrowUp")
    expect(screen.getByRole("button", { name: "Excluir Banner 1" })).toHaveAttribute("aria-keyshortcuts", "Delete")
  })

  it("cannot move past either end", () => {
    bar({ canMoveUp: false })

    expect(screen.getByRole("button", { name: "Subir Banner 1" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Descer Banner 1" })).toBeEnabled()
  })

  // The shop's last list of products cannot go, and a bin that refuses is a bin that lies.
  it("draws no bin where nothing may be deleted", () => {
    bar({ onDelete: undefined })

    expect(screen.queryByRole("button", { name: /Excluir/ })).not.toBeInTheDocument()
  })

  it("brings back what is hidden with the same button", () => {
    bar({ hidden: true })

    expect(screen.getByRole("button", { name: "Mostrar Banner 1" })).toBeInTheDocument()
  })

  it("switches the block's format from a menu of the ones its kind draws", async () => {
    const onLayout = vi.fn()
    bar({ layouts: ["CAROUSEL", "GRID"], layout: "CAROUSEL", onLayout })

    await userEvent.click(screen.getByRole("button", { name: "Trocar layout de Banner 1" }))
    await userEvent.click(await screen.findByRole("menuitemradio", { name: "Grade" }))

    expect(onLayout).toHaveBeenCalledWith("GRID")
  })

  it("offers no layout where the kind draws one only", () => {
    bar({ layouts: undefined })

    expect(screen.queryByRole("button", { name: /Trocar layout/ })).not.toBeInTheDocument()
  })

  // The WAI-ARIA toolbar: ← → move between its buttons, past the disabled ones, and wrap.
  it("moves the focus along its buttons with the arrow keys", async () => {
    bar({ canMoveUp: false })

    screen.getByRole("button", { name: "Descer Banner 1" }).focus()
    await userEvent.keyboard("{ArrowRight}")
    expect(screen.getByRole("button", { name: "Ocultar Banner 1" })).toHaveFocus()
    await userEvent.keyboard("{End}")
    expect(screen.getByRole("button", { name: "Excluir Banner 1" })).toHaveFocus()
    await userEvent.keyboard("{ArrowRight}")
    expect(screen.getByRole("button", { name: "Descer Banner 1" })).toHaveFocus()
  })

  // The menu is a portal whose keys still bubble through the bar: its ← → stay in the menu.
  it("leaves the open layout menu's arrows to the menu", async () => {
    bar({ layouts: ["CAROUSEL", "GRID"], layout: "CAROUSEL", onLayout: vi.fn() })

    await userEvent.click(screen.getByRole("button", { name: "Trocar layout de Banner 1" }))
    const item = await screen.findByRole("menuitemradio", { name: "Grade" })
    item.focus()
    await userEvent.keyboard("{ArrowRight}")

    expect(screen.getByRole("button", { name: "Subir Banner 1" })).not.toHaveFocus()
    expect(screen.getByRole("menu")).toBeInTheDocument()
  })

  it("marks itself as the editor's stop, so its keys walk from it", () => {
    bar({ nodeId: "band-1" })

    expect(screen.getByRole("toolbar")).toHaveAttribute("data-design-node", "band-1")
  })

  it("speaks the panel's language", () => {
    bar({ messages: en })

    expect(screen.getByRole("toolbar", { name: "Actions for Banner 1" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Move Banner 1 up" })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = bar({ layouts: ["RAIL", "GRID"], layout: "RAIL", onLayout: vi.fn() })

    await expectNoA11yViolations(container)
  })
})
