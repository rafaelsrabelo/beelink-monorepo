// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { BandArrangement, type ArrangementBand } from "./band-arrangement"

const bands: ArrangementBand[] = [
  {
    id: "band-1",
    background: null,
    isActive: true,
    components: [
      { id: "1", kind: "BANNER", title: null, imageUrl: "/cover.jpg", layout: "FULL", isActive: true },
    ],
  },
  {
    id: "band-2",
    background: null,
    isActive: true,
    components: [
      { id: "2", kind: "BANNER", title: "Frete grátis", imageUrl: "/b.jpg", layout: "HALVES", isActive: false },
      { id: "3", kind: "PRODUCTS", title: null, layout: "FULL", isActive: true },
    ],
  },
]

function renderBands(overrides: Partial<React.ComponentProps<typeof BandArrangement>> = {}) {
  const handlers = {
    onReorder: vi.fn(),
    onReorderComponents: vi.fn(),
    onToggleBand: vi.fn(),
    onEditBand: vi.fn(),
    onDeleteBand: vi.fn(),
    onToggle: vi.fn(),
    onLayoutChange: vi.fn(),
    onDelete: vi.fn(),
    onEdit: vi.fn(),
  }

  const view = render(<BandArrangement bands={bands} {...handlers} {...overrides} />)

  return { ...view, ...handlers }
}

describe("BandArrangement", () => {
  it("calls a band by where it sits, because a band has no name", () => {
    renderBands()

    expect(screen.getByRole("button", { name: "Arrastar: Faixa 1" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Arrastar: Faixa 2" })).toBeInTheDocument()
  })

  it("calls an untitled component by its kind", () => {
    renderBands()

    // Rows reading "Sem título" would say which are unfinished and nothing about which is which —
    // the one question a list of components exists to answer.
    expect(screen.getByRole("button", { name: "Arrastar: Banner" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Arrastar: Lista de produtos" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Arrastar: Frete grátis" })).toBeInTheDocument()
  })

  it("offers a size on a poster and on nothing else", () => {
    renderBands()

    // "How wide" is a question about a poster. The product rails are as wide as their band, and
    // offering the choice there would change nothing.
    expect(screen.getByRole("combobox", { name: "Tamanho: Frete grátis" })).toBeInTheDocument()
    expect(screen.queryByRole("combobox", { name: /Lista de produtos/ })).not.toBeInTheDocument()
  })

  it("says the size in words, never the stored value", () => {
    renderBands()

    // Base UI shows the raw value unless the trigger is given a render function, and that
    // regression is invisible in a type-check.
    expect(screen.getByRole("combobox", { name: "Tamanho: Frete grátis" })).toHaveTextContent("Metade")
  })

  it("asks for the opposite of what a band is now", async () => {
    const user = userEvent.setup()
    const { onToggleBand } = renderBands()

    await user.click(screen.getByRole("button", { name: "Esconder da loja: Faixa 1" }))

    expect(onToggleBand).toHaveBeenCalledWith("band-1", false)
  })

  /**
   * The complaint that produced this: the panel offered an eye and no bin, so a banner could be
   * hidden and never removed. Every kind but the product rails has one now.
   */
  it("offers a bin on a banner, and none on the product rails", () => {
    renderBands()

    expect(screen.getByRole("button", { name: "Excluir bloco: Frete grátis" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Excluir bloco: Lista de produtos" })).not.toBeInTheDocument()
  })

  /**
   * The bigger door. The product list's row draws no bin, and the band holding it must not either:
   * a shop lost its shelves through exactly this bin before the check existed.
   */
  it("draws no bin on the band that holds the product list", () => {
    renderBands()

    expect(screen.getByRole("button", { name: "Excluir faixa: Faixa 1" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Excluir faixa: Faixa 2" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Esconder da loja: Faixa 2" })).toBeInTheDocument()
  })

  it("opens a component's own fields from its row", async () => {
    const user = userEvent.setup()
    const { onEdit } = renderBands()

    await user.click(screen.getByRole("button", { name: /^Frete grátis/ }))

    expect(onEdit).toHaveBeenCalledWith("2")
  })

  it("invites a first band instead of drawing an empty list", () => {
    renderBands({ bands: [] })

    expect(screen.getByText("Nada para arrumar ainda.")).toBeInTheDocument()
    expect(screen.queryByRole("list")).not.toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderBands()

    await expectNoA11yViolations(container)
  })
})
