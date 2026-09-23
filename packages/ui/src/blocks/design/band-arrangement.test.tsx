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
      // Two pictures: a carousel, which runs the width of its band whatever a size says.
      { id: "1", kind: "BANNER", title: null, imageUrl: "/cover.jpg", slides: 2, layout: "FULL", isActive: true },
    ],
  },
  {
    id: "band-2",
    background: null,
    isActive: true,
    components: [
      // One picture: a poster, the only shape the size actually changes.
      { id: "2", kind: "BANNER", title: "Frete grátis", imageUrl: "/b.jpg", slides: 1, layout: "HALVES", isActive: false },
      { id: "3", kind: "PRODUCTS", title: null, layout: "FULL", isActive: true, deletable: false },
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
    expect(screen.getByRole("group", { name: "Tamanho: Frete grátis" })).toBeInTheDocument()
    expect(screen.queryByRole("group", { name: /Lista de produtos/ })).not.toBeInTheDocument()
  })

  /**
   * The regression this rule first shipped with, reported the day it landed: a banner added a
   * moment ago has no picture, so a rule of "exactly one" took the control away during the whole
   * time the owner is building the thing and deciding how wide it goes.
   */
  it("offers a size on a banner that has no picture yet", () => {
    renderBands({
      bands: [
        {
          id: "band-1",
          background: null,
          isActive: true,
          components: [
            { id: "novo", kind: "BANNER", title: null, slides: 0, layout: "FULL", isActive: true, empty: true },
          ],
        },
      ],
    })

    expect(screen.getByRole("group", { name: "Tamanho: Banner" })).toBeInTheDocument()
  })

  /**
   * A banner stops being a poster at its second picture — `isPoster` in the renderer says one — so
   * the control stopped being offered there. It used to be, and it kept marking the page as having
   * unpublished changes while changing nothing on it. Dropping it also gives its 7rem back to the
   * name, which is what had been truncating "Banner" to "B…" in a 380px panel.
   */
  it("offers no size on a carousel", () => {
    renderBands()

    expect(screen.queryByRole("group", { name: "Tamanho: Banner" })).not.toBeInTheDocument()
  })

  /**
   * Three glyphs, each saying its own name, and the current one pressed. The 112px select they
   * replaced is why the block's name had eight pixels — measured in the harness at the panel's
   * real 380px.
   */
  it("names each size and marks the current one", () => {
    renderBands()

    // Scoped to one row: the fixture has four banners, so each size name appears four times.
    const tamanho = screen.getByRole("group", { name: "Tamanho: Frete grátis" })

    expect(within(tamanho).getByRole("button", { name: "Metade", pressed: true })).toBeInTheDocument()
    expect(within(tamanho).getByRole("button", { name: "Cheio", pressed: false })).toBeInTheDocument()
    expect(within(tamanho).getByRole("button", { name: "Um terço", pressed: false })).toBeInTheDocument()
  })

  /**
   * The control changed shape — a select became three glyphs — and nothing asserted that it still
   * reports a change. Two posters side by side is exactly this callback firing twice.
   */
  it("reports the size the owner chose", async () => {
    const user = userEvent.setup()
    const { onLayoutChange } = renderBands()

    const tamanho = screen.getByRole("group", { name: "Tamanho: Frete grátis" })
    await user.click(within(tamanho).getByRole("button", { name: "Um terço" }))

    expect(onLayoutChange).toHaveBeenCalledWith("2", "THIRDS")
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
