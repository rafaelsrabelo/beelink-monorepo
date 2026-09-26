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

function handlersOf() {
  return {
    onReorder: vi.fn(),
    onReorderComponents: vi.fn(),
    onToggleBand: vi.fn(),
    onEditBand: vi.fn(),
    onDeleteBand: vi.fn(),
    onToggle: vi.fn(),
    onDelete: vi.fn(),
    onEdit: vi.fn(),
  }
}

function renderBands(overrides: Partial<React.ComponentProps<typeof BandArrangement>> = {}) {
  const handlers = handlersOf()

  const view = render(<BandArrangement bands={bands} {...handlers} {...overrides} />)

  return { ...view, ...handlers }
}

describe("BandArrangement", () => {
  // BEELINK-124: with every "+" shown on hover only, a mouse on a desktop saw no way to add anything —
  // the shopkeeper could not find where a banner went. The one at the foot of the page stays in sight.
  it("keeps a visible “Nova faixa” at the foot of the page, where the pointer need not find it", async () => {
    const onInsert = vi.fn()
    renderBands({ onInsert })

    const add = screen.getByRole("button", { name: "Nova faixa na posição 3" })
    expect(add).toHaveTextContent("Nova faixa")
    expect(add).not.toHaveClass("opacity-0")
    // Its focus ring drawn inside it: the panel scrolls and would clip one drawn outside.
    expect(add).toHaveClass("focus-visible:ring-inset")

    await userEvent.click(add)
    expect(onInsert).toHaveBeenCalledWith({ level: "band", index: 2 })
  })

  describe("side by side — the owner's “não consigo colocar banners ao lado do outro”", () => {
    const stacked: ArrangementBand[] = [
      { id: "top", isActive: true, components: [{ id: "a", kind: "BANNER", title: "Inverno", span: "FULL", isActive: true }] },
      { id: "below", isActive: true, components: [{ id: "b", kind: "BANNER", title: "Verão", span: "FULL", isActive: true }] },
    ]

    it("offers “Adicionar ao lado” in words on every block, and a whole one gives up half its row", async () => {
      const onInsert = vi.fn()
      renderBands({ bands: stacked, onInsert })

      const beside = screen.getByRole("button", { name: "Adicionar ao lado de Inverno" })
      expect(beside).toHaveTextContent("Adicionar ao lado")
      await userEvent.click(beside)

      expect(onInsert).toHaveBeenCalledWith({
        level: "beside",
        sectionId: "top",
        afterId: "a",
        span: "HALF",
        rebalance: [{ id: "a", span: "HALF" }],
      })
    })

    it("puts a lone block up beside the band above's last one, in the same row", async () => {
      const onJoinAbove = vi.fn()
      renderBands({ bands: stacked, onJoinAbove })

      await userEvent.click(screen.getByRole("button", { name: "Pôr ao lado de Inverno" }))

      expect(onJoinAbove).toHaveBeenCalledWith({
        componentId: "b",
        sectionId: "top",
        afterId: "a",
        span: "HALF",
        rebalance: [{ id: "a", span: "HALF" }],
      })
      // The first band has no band above it to join.
      expect(screen.queryByRole("button", { name: /Pôr ao lado de Verão/ })).not.toBeInTheDocument()
    })

    // The grid draws what is shown: a hidden block counted into a row left room the page did not have.
    it("reads the rows from the shown blocks only, so the newcomer lands beside and not below", async () => {
      const onInsert = vi.fn()
      renderBands({
        bands: [
          {
            id: "row",
            isActive: true,
            components: [
              { id: "a", kind: "BANNER", title: "A", span: "HALF", isActive: true },
              { id: "h", kind: "BANNER", title: "Oculto", span: "HALF", isActive: false },
              { id: "b", kind: "BANNER", title: "B", span: "HALF", isActive: true },
            ],
          },
        ],
        onInsert,
      })

      await userEvent.click(screen.getByRole("button", { name: "Adicionar ao lado de B" }))

      // Drawn [A, B] is a full row: the three become thirds, and the hidden one keeps its width.
      expect(onInsert).toHaveBeenCalledWith({
        level: "beside",
        sectionId: "row",
        afterId: "b",
        span: "THIRD",
        rebalance: [
          { id: "a", span: "THIRD" },
          { id: "b", span: "THIRD" },
        ],
      })
      expect(screen.queryByRole("button", { name: "Adicionar ao lado de Oculto" })).not.toBeInTheDocument()
    })

    // A move is a saved write: a hidden block moved into a shown band would go live without Publicar.
    it("offers no move up from or into a hidden band, nor into the strip's band", () => {
      const onJoinAbove = vi.fn()
      const { rerender } = renderBands({ bands: [stacked[0]!, { ...stacked[1]!, isActive: false }], onJoinAbove })
      expect(screen.queryByRole("button", { name: /Pôr ao lado de/ })).not.toBeInTheDocument()

      const strip: ArrangementBand = {
        id: "strip",
        isActive: true,
        components: [
          { id: "s", kind: "ANNOUNCEMENT", title: "Frete grátis", span: "FULL", isActive: true },
          { id: "t", kind: "BANNER", title: "Topo", span: "HALF", isActive: true },
        ],
      }
      rerender(<BandArrangement bands={[strip, stacked[1]!]} {...handlersOf()} onJoinAbove={onJoinAbove} />)
      expect(screen.queryByRole("button", { name: /Pôr ao lado de/ })).not.toBeInTheDocument()
    })

    it("offers nothing beside a full row of three, since a third is the narrowest slice", () => {
      const onInsert = vi.fn()
      renderBands({
        bands: [
          {
            id: "row",
            isActive: true,
            components: ["x", "y", "z"].map((id) => ({ id, kind: "BANNER" as const, title: id, span: "THIRD" as const, isActive: true })),
          },
        ],
        onInsert,
      })

      expect(screen.queryByRole("button", { name: /Adicionar ao lado de/ })).not.toBeInTheDocument()
    })
  })

  it("calls a band by where it sits, because a band has no name", () => {
    renderBands()

    expect(screen.getByRole("button", { name: "Arrastar: Faixa 1" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Arrastar: Faixa 2" })).toBeInTheDocument()
  })

  it("calls an untitled component by its kind", () => {
    renderBands()

    // Rows reading "Sem título" would say which are unfinished and nothing about which is which —
    // the one question a list of components exists to answer.
    // The first band holds one block, so its card is the block's: named by the block, moved as the band.
    expect(screen.getByRole("button", { name: /^Banner/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Arrastar: Vitrine de produtos" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Arrastar: Frete grátis" })).toBeInTheDocument()
  })

  /**
   * The slice is chosen in the Layout tab now; the row says it beside the kind, so a band's
   * arrangement still reads at a glance — and has no control that makes every row twice as tall.
   */
  it("says each block's kind and slice on one line, with no width control", () => {
    renderBands()

    expect(screen.getByRole("button", { name: /^Frete grátis/ })).toHaveTextContent("Banner · Metade")
    expect(screen.getByRole("button", { name: /^Vitrine de produtos/ })).toHaveTextContent("Vitrine de produtos · Cheio")
    expect(screen.queryByRole("group", { name: /Largura do bloco/ })).not.toBeInTheDocument()
  })

  /** The strip above the header is never in a band's grid, so it has no slice to say. */
  it("says no slice for the strip above the header, and that an empty block is empty", () => {
    renderBands({
      bands: [
        {
          id: "band-1",
          background: null,
          isActive: true,
          components: [
            { id: "faixa", kind: "ANNOUNCEMENT", title: "Frete grátis", span: "FULL", isActive: true },
            { id: "novo", kind: "BANNER", title: null, span: "HALF", isActive: true, empty: true },
          ],
        },
      ],
    })

    expect(screen.getByRole("button", { name: /^Frete grátis/ })).toHaveTextContent(/Barra de aviso$/)
    expect(screen.getByRole("button", { name: /^Banner/ })).toHaveTextContent("Vazio — não aparece na loja · Metade")
  })

  // The header of a band of several blocks chooses the band; the panel then shows its Estilo.
  it("chooses a band from its header, and marks it as a block is marked", async () => {
    const user = userEvent.setup()
    const { onEditBand, rerender } = renderBands()

    await user.click(screen.getByRole("button", { name: "Faixa 2" }))
    expect(onEditBand).toHaveBeenCalledWith("band-2")

    rerender(<BandArrangement bands={bands} {...handlersOf()} selectedBandId="band-2" />)
    expect(screen.getByRole("button", { name: "Arrastar: Faixa 2" }).closest("li")).toHaveAttribute("aria-current", "true")
  })

  it("asks for the opposite of what a band is now", async () => {
    const user = userEvent.setup()
    const { onToggleBand } = renderBands()

    await user.click(screen.getByRole("button", { name: "Esconder da loja: Faixa 2" }))

    expect(onToggleBand).toHaveBeenCalledWith("band-2", false)
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

    // The first band's card deletes the band with its one block; the second holds the last shelf.
    expect(screen.getByRole("button", { name: "Excluir bloco: Banner" })).toBeInTheDocument()
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

describe("BandArrangement — a block kept for one screen", () => {
  // Said on the row, so the structure explains why the phone's preview has no such block.
  it("says so on the row", () => {
    renderBands({
      bands: [
        {
          id: "band-9",
          background: null,
          isActive: true,
          components: [
            { id: "9", kind: "HEADING", title: "Frete", span: "HALF", isActive: true, visibleOn: "PHONE" },
            { id: "10", kind: "TEXT", title: "Troca", span: "HALF", isActive: true, visibleOn: "DESKTOP" },
          ],
        },
      ],
    })

    expect(screen.getByText("Título · Metade · Só no celular")).toBeInTheDocument()
    expect(screen.getByText("Parágrafo · Metade · Só no computador")).toBeInTheDocument()
  })
})
