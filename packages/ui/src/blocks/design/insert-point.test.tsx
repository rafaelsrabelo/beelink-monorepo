// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { BandArrangement, type ArrangementBand } from "./band-arrangement"
import { InsertPoint } from "./insert-point"

function band(id: string, titles: string[]): ArrangementBand {
  return {
    id,
    name: null,
    isActive: true,
    components: titles.map((title) => ({ id: `${id}-${title}`, kind: "HEADING" as const, title, span: "FULL" as const, isActive: true })),
  }
}

const handlers = {
  onReorder: vi.fn(),
  onReorderComponents: vi.fn(),
  onToggleBand: vi.fn(),
  onEditBand: vi.fn(),
  onDeleteBand: vi.fn(),
  onToggle: vi.fn(),
  onSpanChange: vi.fn(),
  onDelete: vi.fn(),
  onEdit: vi.fn(),
}

describe("InsertPoint", () => {
  it("is a named button that inserts, reachable from the keyboard", async () => {
    const user = userEvent.setup()
    const onInsert = vi.fn()
    render(
      <ul>
        <InsertPoint label="Nova faixa na posição 2" onInsert={onInsert} />
      </ul>,
    )

    await user.tab()
    expect(screen.getByRole("button", { name: "Nova faixa na posição 2" })).toHaveFocus()
    await user.keyboard("{Enter}")

    expect(onInsert).toHaveBeenCalledOnce()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <ul>
        <InsertPoint label="Nova faixa na posição 1" onInsert={vi.fn()} />
      </ul>,
    )

    await expectNoA11yViolations(container)
  })
})

describe("BandArrangement — one verb for adding, where it lands", () => {
  it("offers a + before every band and after the last, each saying where", async () => {
    const user = userEvent.setup()
    const onInsert = vi.fn()
    render(<BandArrangement bands={[band("a", ["Um"]), band("b", ["Dois", "Três"])]} onInsert={onInsert} {...handlers} />)

    expect(screen.getAllByRole("button", { name: /^Nova faixa na posição/ }).map((button) => button.getAttribute("aria-label"))).toEqual([
      "Nova faixa na posição 1",
      "Nova faixa na posição 2",
      "Nova faixa na posição 3",
    ])
    await user.click(screen.getByRole("button", { name: "Nova faixa na posição 2" }))

    expect(onInsert).toHaveBeenCalledWith({ level: "band", index: 1 })
  })

  // Inside a band is the only way two blocks share a row.
  it("offers a + before each block of a band and after its last", async () => {
    const user = userEvent.setup()
    const onInsert = vi.fn()
    render(<BandArrangement bands={[band("a", ["Um"]), band("b", ["Dois", "Três"])]} onInsert={onInsert} {...handlers} />)

    expect(screen.getAllByRole("button", { name: /^Novo bloco em Faixa 2/ })).toHaveLength(3)
    await user.click(screen.getByRole("button", { name: "Novo bloco em Faixa 2, posição 2" }))
    await user.click(screen.getByRole("button", { name: "Novo bloco em Faixa 1, posição 2" }))

    expect(onInsert).toHaveBeenNthCalledWith(1, { level: "block", sectionId: "b", index: 1 })
    expect(onInsert).toHaveBeenNthCalledWith(2, { level: "block", sectionId: "a", index: 1 })
  })

  it("gives an empty page a button for its first band, and offers nothing without a way to add", async () => {
    const user = userEvent.setup()
    const onInsert = vi.fn()
    const { unmount } = render(<BandArrangement bands={[]} onInsert={onInsert} {...handlers} />)
    await user.click(screen.getByRole("button", { name: "Adicionar bloco" }))
    expect(onInsert).toHaveBeenCalledWith({ level: "band", index: 0 })
    unmount()

    render(<BandArrangement bands={[band("a", ["Um"])]} {...handlers} />)
    expect(screen.queryByRole("button", { name: /^Nova faixa/ })).not.toBeInTheDocument()
  })
})
