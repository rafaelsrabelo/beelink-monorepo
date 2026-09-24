// Libs
import { render, screen, within } from "@testing-library/react"
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
      // Two pictures: a carousel, which fills its own cell like any other block.
      { id: "1", kind: "BANNER", title: null, imageUrl: "/cover.jpg", span: "FULL", isActive: true },
    ],
  },
  {
    id: "band-2",
    background: null,
    isActive: true,
    components: [
      { id: "2", kind: "BANNER", title: "Frete grátis", imageUrl: "/b.jpg", span: "HALF", isActive: false },
      { id: "3", kind: "PRODUCTS", title: null, span: "FULL", isActive: true, deletable: false },
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
    onSpanChange: vi.fn(),
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
    expect(screen.getByRole("button", { name: "Arrastar: Vitrine de produtos" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Arrastar: Frete grátis" })).toBeInTheDocument()
  })

  /**
   * Every block has a slice of its band — a heading beside a banner is as reachable as two banners —
   * so every block's card offers one. The product list included.
   */
  it("offers a width on every kind of block", () => {
    renderBands()

    expect(screen.getByRole("group", { name: "Largura do bloco: Frete grátis" })).toBeInTheDocument()
    expect(screen.getByRole("group", { name: "Largura do bloco: Vitrine de produtos" })).toBeInTheDocument()
  })

  /**
   * The regression this rule first shipped with, reported the day it landed: a banner added a
   * moment ago has no picture, so a rule of "exactly one" took the control away during the whole
   * time the owner is building the thing and deciding how wide it goes.
   */
  it("offers a width on a banner that has no picture yet", () => {
    renderBands({
      bands: [
        {
          id: "band-1",
          background: null,
          isActive: true,
          components: [{ id: "novo", kind: "BANNER", title: null, span: "FULL", isActive: true, empty: true }],
        },
      ],
    })

    expect(screen.getByRole("group", { name: "Largura do bloco: Banner" })).toBeInTheDocument()
  })

  /** The strip above the header is never in a band's grid, so a width there would change nothing. */
  it("offers no width on the strip above the header", () => {
    renderBands({
      bands: [
        {
          id: "band-1",
          background: null,
          isActive: true,
          components: [{ id: "faixa", kind: "ANNOUNCEMENT", title: "Frete grátis", span: "FULL", isActive: true }],
        },
      ],
    })

    expect(screen.queryByRole("group", { name: /Largura do bloco/ })).not.toBeInTheDocument()
  })

  /**
   * Four glyphs, each named by its slice, the current one pressed — and the slice written out, so
   * the owner does not hover to learn what the block is.
   */
  it("names each slice, marks the current one and writes it out", () => {
    renderBands()

    const largura = screen.getByRole("group", { name: "Largura do bloco: Frete grátis" })

    expect(within(largura).getByRole("button", { name: "Metade", pressed: true })).toBeInTheDocument()
    for (const other of ["Cheio", "Dois terços", "Um terço"]) {
      expect(within(largura).getByRole("button", { name: other, pressed: false })).toBeInTheDocument()
    }
    expect(largura.parentElement).toHaveTextContent("Metade")
  })

  /**
   * The band's width beside the block's, in words of its own: "Tamanho" beside the band's
   * "Largura" read as one setting in two places.
   */
  it("says the band's width beside the block's, without mistaking one for the other", () => {
    renderBands({ bands: bands.map((band) => ({ ...band, width: "FULL" as const })) })

    const largura = screen.getByRole("group", { name: "Largura do bloco: Frete grátis" })
    expect(largura.parentElement).toHaveTextContent("Largura da faixa: Ponta a ponta")
  })

  it("reports the slice the owner chose, two thirds included", async () => {
    const user = userEvent.setup()
    const { onSpanChange } = renderBands()

    const largura = screen.getByRole("group", { name: "Largura do bloco: Frete grátis" })
    await user.click(within(largura).getByRole("button", { name: "Dois terços" }))

    expect(onSpanChange).toHaveBeenCalledWith("2", "TWO_THIRDS")
  })

  it("asks for the opposite of what a band is now", async () => {
    const user = userEvent.setup()
    const { onToggleBand } = renderBands()

    await user.click(screen.getByRole("button", { name: "Esconder da loja: Faixa 1" }))

    expect(onToggleBand).toHaveBeenCalledWith("band-1", false)
  })

  /**
   * The complaint that produced this: the panel offered an eye and no bin, so a banner could be
   * hidden and never removed. Every row has one unless the screen says it cannot go.
   */
  it("offers a bin on a banner, and none on a row the screen marked as staying", () => {
    renderBands()

    expect(screen.getByRole("button", { name: "Excluir bloco: Frete grátis" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Excluir bloco: Vitrine de produtos" })).not.toBeInTheDocument()
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
