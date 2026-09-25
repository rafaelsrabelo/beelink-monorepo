// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentProps } from "react"
import { describe, expect, it, vi } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { DesignPanel } from "./design-panel"

const colours = { background: "", primary: "", header: "", footer: "" }

function props(over: Partial<ComponentProps<typeof DesignPanel>> = {}): ComponentProps<typeof DesignPanel> {
  return {
    bands: [{ id: "b1", isActive: true, components: [{ id: "c1", kind: "HEADING", title: "Oi", span: "FULL", isActive: true }] }],
    loading: false,
    onReorder: vi.fn(),
    onReorderComponents: vi.fn(),
    onToggleBand: vi.fn(),
    onEditBand: vi.fn(),
    onDeleteBand: vi.fn(),
    onToggle: vi.fn(),
    onSpanChange: vi.fn(),
    onDelete: vi.fn(),
    onEdit: vi.fn(),
    onInsert: vi.fn(),
    inserting: false,
    selectedId: null,
    tab: "blocks",
    onTabChange: vi.fn(),
    palette: colours,
    onPalette: vi.fn(),
    presets: [],
    paletteChanged: false,
    savingColours: false,
    onSaveColours: vi.fn(),
    messages: ptBR,
    ...over,
  }
}

describe("DesignPanel — the editor's structure column", () => {
  // The chosen block's fields moved to the right-hand column; the list here still marks it.
  it("lists the page's bands and marks the block being edited", () => {
    render(<DesignPanel {...props({ selectedId: "c1" })} />)

    expect(screen.getByRole("tab", { name: "Seções" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("button", { name: /^Oi/ }).closest("li")).toHaveAttribute("aria-current", "true")
  })

  // The colours are the page's theme now, a tab of their own beside the sections.
  it("hands the tab choice back, and keeps the list mounted while the theme shows", async () => {
    const user = userEvent.setup()
    const onTabChange = vi.fn()
    const { rerender } = render(<DesignPanel {...props({ onTabChange })} />)

    await user.click(screen.getByRole("tab", { name: "Tema" }))
    expect(onTabChange).toHaveBeenCalledWith("colors")

    rerender(<DesignPanel {...props({ tab: "colors" })} />)
    expect(screen.getByRole("tab", { name: "Tema" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("button", { name: /^Oi/, hidden: true })).toBeInTheDocument()
  })
})
