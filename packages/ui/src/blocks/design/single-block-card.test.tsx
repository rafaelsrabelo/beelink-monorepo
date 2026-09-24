// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { BandArrangement, type ArrangementBand } from "./band-arrangement"

function band(id: string, components: ArrangementBand["components"], over: Partial<ArrangementBand> = {}): ArrangementBand {
  return { id, name: null, background: null, width: "CONTAINED", isActive: true, components, ...over }
}

const cover = { id: "c1", kind: "BANNER" as const, title: "Capa", imageUrl: "/capa.jpg", span: "FULL" as const, isActive: true }

function renderBands(bands: ArrangementBand[]) {
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
  const view = render(<BandArrangement bands={bands} {...handlers} />)
  return { ...view, ...handlers }
}

describe("SingleBlockCard — a band of one block is one card", () => {
  // The shop the editor was measured on: five bands, one block each.
  it("draws five single-block bands as five cards, and no container among them", () => {
    const five = Array.from({ length: 5 }, (_, at) => band(`b${at}`, [{ ...cover, id: `c${at}`, title: `Bloco ${at + 1}` }]))
    const { container } = renderBands(five)

    expect(screen.getAllByRole("button", { name: /^Arrastar:/ })).toHaveLength(5)
    expect(container.querySelectorAll("li ul")).toHaveLength(0)
    expect(screen.getByRole("button", { name: /^Bloco 3/ })).toBeInTheDocument()
  })

  it("names the block, says its band, and moves as the band", () => {
    const { container } = renderBands([band("b1", [cover], { name: "Destaque", width: "FULL" })])

    expect(screen.getByRole("button", { name: "Arrastar: Destaque" })).toBeInTheDocument()
    expect(container.querySelector('img[src="/capa.jpg"]')).toBeInTheDocument()
    expect(screen.getByText(/Ponta a ponta/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^Capa/ })).toHaveTextContent("Destaque · Banner")
    expect(screen.getByRole("group", { name: /Largura do bloco: Capa/ })).toBeInTheDocument()
  })

  it("opens the block's fields from its name, and the band's sheet from its swatch", async () => {
    const user = userEvent.setup()
    const { onEdit, onEditBand } = renderBands([band("b1", [cover])])

    await user.click(screen.getByRole("button", { name: /^Capa/ }))
    await user.click(screen.getByRole("button", { name: "Cor e nome da faixa: Faixa 1" }))

    expect(onEdit).toHaveBeenCalledWith("c1")
    expect(onEditBand).toHaveBeenCalledWith("b1")
  })

  it("hides the band, and shows a block hidden on its own along with its band", async () => {
    const user = userEvent.setup()
    const shown = renderBands([band("b1", [cover])])
    await user.click(screen.getByRole("button", { name: "Esconder da loja: Capa" }))
    expect(shown.onToggleBand).toHaveBeenCalledWith("b1", false)
    shown.unmount()

    const hidden = renderBands([band("b1", [{ ...cover, isActive: false }])])
    await user.click(screen.getByRole("button", { name: "Mostrar na loja: Capa", pressed: false }))
    expect(hidden.onToggle).toHaveBeenCalledWith("c1", true)
    expect(hidden.onToggleBand).not.toHaveBeenCalled()
    hidden.unmount()

    const bandHidden = renderBands([band("b1", [cover], { isActive: false })])
    await user.click(screen.getByRole("button", { name: "Mostrar na loja: Capa" }))
    expect(bandHidden.onToggleBand).toHaveBeenCalledWith("b1", true)
    expect(bandHidden.onToggle).not.toHaveBeenCalled()
    bandHidden.unmount()

    // Both hidden: one click shows both — the screen's draft composes the two edits.
    const both = renderBands([band("b1", [{ ...cover, isActive: false }], { isActive: false })])
    await user.click(screen.getByRole("button", { name: "Mostrar na loja: Capa" }))
    expect(both.onToggleBand).toHaveBeenCalledWith("b1", true)
    expect(both.onToggle).toHaveBeenCalledWith("c1", true)
  })

  // The API would leave an empty band behind a deleted only block; the card is one thing to its owner.
  it("deletes the band with its block, and offers no bin on the last shelf", async () => {
    const user = userEvent.setup()
    const { onDeleteBand, onDelete, unmount } = renderBands([band("b1", [cover])])
    await user.click(screen.getByRole("button", { name: "Excluir bloco: Capa" }))
    expect(onDeleteBand).toHaveBeenCalledWith("b1")
    expect(onDelete).not.toHaveBeenCalled()
    unmount()

    renderBands([band("b1", [{ ...cover, kind: "PRODUCTS", deletable: false }])])
    expect(screen.queryByRole("button", { name: /^Excluir/ })).not.toBeInTheDocument()
  })

  it("becomes a container once the band holds a second block", () => {
    const { rerender, onReorder, onReorderComponents, onToggleBand, onEditBand, onDeleteBand, onToggle, onSpanChange, onDelete, onEdit } =
      renderBands([band("b1", [cover])])
    const handlers = { onReorder, onReorderComponents, onToggleBand, onEditBand, onDeleteBand, onToggle, onSpanChange, onDelete, onEdit }

    rerender(<BandArrangement bands={[band("b1", [cover, { ...cover, id: "c2", title: "Segundo" }])]} {...handlers} />)

    const container = screen.getByRole("button", { name: "Arrastar: Faixa 1" }).closest("li")!
    expect(within(container).getByRole("button", { name: "Arrastar: Capa" })).toBeInTheDocument()
    expect(within(container).getByRole("button", { name: "Arrastar: Segundo" })).toBeInTheDocument()
  })

  // The band's last "+" is the same node before and after, so the button just pressed keeps the focus.
  it("keeps the band's last + focused while the card becomes a container", () => {
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
    const onInsert = vi.fn()
    const { rerender } = render(<BandArrangement bands={[band("b1", [cover])]} onInsert={onInsert} {...handlers} />)
    const last = screen.getByRole("button", { name: "Novo bloco em Faixa 1, posição 2" })
    last.focus()

    rerender(
      <BandArrangement bands={[band("b1", [cover, { ...cover, id: "c2", title: "Segundo" }])]} onInsert={onInsert} {...handlers} />,
    )

    // The same button, now the band's third place.
    expect(screen.getByRole("button", { name: "Novo bloco em Faixa 1, posição 3" })).toBe(last)
    expect(last).toHaveFocus()
  })

  // The block whose fields are open is marked in the list as the preview marks it.
  it("marks the selected block, on a card and on a row", () => {
    render(
      <BandArrangement
        bands={[band("b1", [cover]), band("b2", [{ ...cover, id: "c2", title: "Dois" }, { ...cover, id: "c3", title: "Três" }])]}
        selectedId="c3"
        {...{
          onReorder: vi.fn(),
          onReorderComponents: vi.fn(),
          onToggleBand: vi.fn(),
          onEditBand: vi.fn(),
          onDeleteBand: vi.fn(),
          onToggle: vi.fn(),
          onSpanChange: vi.fn(),
          onDelete: vi.fn(),
          onEdit: vi.fn(),
        }}
      />,
    )

    expect(screen.getByRole("button", { name: /^Três/ }).closest("li")).toHaveAttribute("aria-current", "true")
    expect(screen.getByRole("button", { name: /^Capa/ }).closest("li")).not.toHaveAttribute("aria-current")
  })

  it("marks a selected single-block card as the band's item", () => {
    render(
      <BandArrangement
        bands={[band("b1", [cover])]}
        selectedId="c1"
        {...{
          onReorder: vi.fn(),
          onReorderComponents: vi.fn(),
          onToggleBand: vi.fn(),
          onEditBand: vi.fn(),
          onDeleteBand: vi.fn(),
          onToggle: vi.fn(),
          onSpanChange: vi.fn(),
          onDelete: vi.fn(),
          onEdit: vi.fn(),
        }}
      />,
    )

    const card = screen.getByRole("button", { name: /^Capa/ }).closest("li")!
    expect(card).toHaveAttribute("aria-current", "true")
    expect(card.className).toContain("ring-primary")
  })

  it("has no accessibility violations", async () => {
    const { container } = renderBands([band("b1", [cover]), band("b2", [{ ...cover, id: "c2", isActive: false }])])

    await expectNoA11yViolations(container)
  })
})
