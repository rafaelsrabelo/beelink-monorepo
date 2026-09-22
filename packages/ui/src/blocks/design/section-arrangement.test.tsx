// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { SectionArrangement, type ArrangementItem } from "./section-arrangement"

const items: ArrangementItem[] = [
  { id: "1", kind: "COVER", title: null, imageUrl: "/cover.jpg", layout: "FULL", isActive: true },
  { id: "2", kind: "BANNER", title: "Frete grátis", imageUrl: "/b.jpg", layout: "HALVES", isActive: false },
  { id: "3", kind: "PRODUCTS", title: null, imageUrl: null, layout: "FULL", isActive: true },
]

function renderList(overrides: Partial<React.ComponentProps<typeof SectionArrangement>> = {}) {
  const onReorder = vi.fn()
  const onToggle = vi.fn()
  const onLayoutChange = vi.fn()

  const view = render(
    <SectionArrangement
      items={items}
      onReorder={onReorder}
      onToggle={onToggle}
      onLayoutChange={onLayoutChange}
      {...overrides}
    />,
  )

  return { ...view, onReorder, onToggle, onLayoutChange }
}

describe("SectionArrangement", () => {
  it("calls an untitled block by its kind", () => {
    renderList()

    // Three rows reading "Sem título" would say which blocks are unfinished and nothing about
    // which is which — the one question a list of blocks exists to answer.
    expect(screen.getByRole("button", { name: "Arrastar: Capa" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Arrastar: Lista de produtos" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Arrastar: Frete grátis" })).toBeInTheDocument()
  })

  it("names every control after the block it acts on", () => {
    renderList()

    expect(screen.getByRole("button", { name: "Esconder da loja: Capa" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Mostrar na loja: Frete grátis" })).toBeInTheDocument()
  })

  it("offers a size on a poster and on nothing else", () => {
    renderList()

    // "How wide" is a question about a poster. A cover is as wide as its own `width` says and the
    // product rails are as wide as the page; offering the choice would change nothing.
    expect(screen.getByRole("combobox", { name: "Tamanho: Frete grátis" })).toBeInTheDocument()
    expect(screen.queryByRole("combobox", { name: /Capa/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("combobox", { name: /Lista de produtos/ })).not.toBeInTheDocument()
  })

  it("says the size in words, never the stored value", () => {
    renderList()

    // Base UI shows the raw value unless the trigger is given a render function, and that
    // regression is invisible in a type-check.
    expect(screen.getByRole("combobox", { name: "Tamanho: Frete grátis" })).toHaveTextContent("Metade")
  })

  it("asks for the opposite of what a block is now", async () => {
    const user = userEvent.setup()
    const { onToggle } = renderList()

    await user.click(screen.getByRole("button", { name: "Esconder da loja: Capa" }))

    expect(onToggle).toHaveBeenCalledWith("1", false)
  })

  it("invites a first block instead of drawing an empty list", () => {
    renderList({ items: [] })

    expect(screen.getByText("Nenhum banner para arrumar.")).toBeInTheDocument()
    expect(screen.queryByRole("list")).not.toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderList()

    await expectNoA11yViolations(container)
  })
})
