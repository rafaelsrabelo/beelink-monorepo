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
    inspector: null,
    selectedId: null,
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

describe("DesignPanel — the inspector above the list", () => {
  // The fields open inside the panel, and the list — marked — stays below them.
  it("draws the selected block's fields over a list that still shows it marked", () => {
    render(<DesignPanel {...props({ inspector: <section aria-label="Campos">campos</section>, selectedId: "c1" })} />)

    expect(screen.getByRole("region", { name: "Campos" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^Oi/ })).toHaveAttribute("aria-pressed", "true")
  })

  it("comes back to the blocks tab when a block is chosen while the colours show", async () => {
    const user = userEvent.setup()
    const { rerender } = render(<DesignPanel {...props()} />)
    await user.click(screen.getByRole("tab", { name: "Cores" }))
    expect(screen.getByRole("tab", { name: "Cores" })).toHaveAttribute("aria-selected", "true")

    rerender(<DesignPanel {...props({ inspector: <section aria-label="Campos">campos</section>, selectedId: "c1" })} />)

    expect(screen.getByRole("tab", { name: "Componentes" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("region", { name: "Campos" })).toBeInTheDocument()
  })
})
