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

describe("DesignPanel — the inspector above the list", () => {
  // The fields open inside the panel, and the list — marked — stays below them.
  it("draws the selected block's fields over a list that still shows it marked", () => {
    render(<DesignPanel {...props({ inspector: <section aria-label="Campos">campos</section>, selectedId: "c1" })} />)

    const fields = screen.getByRole("region", { name: "Campos" })
    const row = screen.getByRole("button", { name: /^Oi/ })
    expect(row.closest("li")).toHaveAttribute("aria-current", "true")
    // The fields first, the list below them.
    expect(fields.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  // The fields being typed in live in the blocks tab: looking at the colours must not throw them away.
  it("keeps the fields mounted while the colours show, and hands the tab choice back", async () => {
    const user = userEvent.setup()
    const onTabChange = vi.fn()
    const { rerender } = render(
      <DesignPanel {...props({ inspector: <input aria-label="Título do bloco" defaultValue="Digitado" />, selectedId: "c1", onTabChange })} />,
    )

    await user.click(screen.getByRole("tab", { name: "Cores" }))
    expect(onTabChange).toHaveBeenCalledWith("colors")

    rerender(<DesignPanel {...props({ inspector: <input aria-label="Título do bloco" defaultValue="Digitado" />, selectedId: "c1", tab: "colors" })} />)
    expect(screen.getByRole("tab", { name: "Cores" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByLabelText("Título do bloco", { selector: "input" })).toHaveValue("Digitado")
  })
})
