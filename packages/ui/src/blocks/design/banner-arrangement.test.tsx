// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { BannerArrangement, type ArrangementItem } from "./banner-arrangement"

const items: ArrangementItem[] = [
  { id: "1", title: "Coleção de inverno", imageUrl: "/a.jpg", layout: "FULL", isActive: true },
  { id: "2", title: "Frete grátis", imageUrl: "/b.jpg", layout: "HALVES", isActive: false },
]

function renderList(overrides: Partial<React.ComponentProps<typeof BannerArrangement>> = {}) {
  const onReorder = vi.fn()
  const onToggle = vi.fn()
  const onLayoutChange = vi.fn()

  const view = render(
    <BannerArrangement
      items={items}
      onReorder={onReorder}
      onToggle={onToggle}
      onLayoutChange={onLayoutChange}
      {...overrides}
    />,
  )

  return { ...view, onReorder, onToggle, onLayoutChange }
}

describe("BannerArrangement", () => {
  it("names every control after the banner it acts on", () => {
    renderList()

    // A panel of four buttons called "Arrastar", "Mostrar", "Arrastar", "Esconder" tells a screen
    // reader which verb but never which poster.
    expect(screen.getByRole("button", { name: "Arrastar: Coleção de inverno" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Esconder da loja: Coleção de inverno" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Mostrar na loja: Frete grátis" })).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Tamanho: Frete grátis" })).toBeInTheDocument()
  })

  it("asks for the opposite of what a banner is now", async () => {
    const user = userEvent.setup()
    const { onToggle } = renderList()

    await user.click(screen.getByRole("button", { name: "Esconder da loja: Coleção de inverno" }))

    expect(onToggle).toHaveBeenCalledWith("1", false)
  })

  it("says the size in words, never the stored value", () => {
    renderList()

    // The select holds "HALVES"; a shopkeeper reads "Metade". Base UI shows the raw value unless
    // the trigger is given a render function, and that regression is invisible in a type-check.
    expect(screen.getByRole("combobox", { name: "Tamanho: Frete grátis" })).toHaveTextContent("Metade")
  })

  it("invites a first banner instead of drawing an empty list", () => {
    renderList({ items: [] })

    expect(screen.getByText("Nenhum banner para arrumar.")).toBeInTheDocument()
    expect(screen.queryByRole("list")).not.toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderList()

    await expectNoA11yViolations(container)
  })
})
