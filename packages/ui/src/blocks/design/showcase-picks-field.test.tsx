// Libs
import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ShowcasePicksField } from "./showcase-picks-field"

const products = [
  { id: "p1", name: "Blusa azul" },
  { id: "p2", name: "Calça jeans" },
  { id: "p3", name: "Boné bordado" },
]

const picks = [
  { id: "a", productId: "p2" },
  { id: "b", productId: "p1" },
]

function renderPicks(value = picks) {
  const onChange = vi.fn()
  const { container } = render(<ShowcasePicksField value={value} onChange={onChange} products={products} newItemId={() => "novo"} />)
  return { onChange, container }
}

/** The field as a screen holds it, so a change redraws it the way the sheet would. */
function Held({ initial }: { initial: typeof picks }) {
  const [value, setValue] = useState(initial)
  return <ShowcasePicksField value={value} onChange={setValue} products={products} newItemId={() => "novo"} />
}

describe("ShowcasePicksField", () => {
  it("lists the picks in the order the page draws them", () => {
    renderPicks()

    expect(screen.getAllByRole("listitem").slice(0, 2).map((row) => row.textContent)).toEqual(["Calça jeans", "Blusa azul"])
  })

  it("moves a pick one place, and never past either end", async () => {
    const user = userEvent.setup()
    const { onChange } = renderPicks()

    expect(screen.getByRole("button", { name: "Subir Calça jeans" })).toHaveAttribute("aria-disabled", "true")
    expect(screen.getByRole("button", { name: "Descer Blusa azul" })).toHaveAttribute("aria-disabled", "true")
    await user.click(screen.getByRole("button", { name: "Subir Blusa azul" }))

    expect(onChange).toHaveBeenCalledWith([picks[1], picks[0]])
  })

  it("takes a pick out", async () => {
    const user = userEvent.setup()
    const { onChange } = renderPicks()

    await user.click(screen.getByRole("button", { name: "Tirar Calça jeans" }))

    expect(onChange).toHaveBeenCalledWith([picks[1]])
  })

  it("adds from a search that offers only what is not picked yet", async () => {
    const user = userEvent.setup()
    const { onChange } = renderPicks()

    expect(screen.queryByRole("button", { name: "Adicionar Blusa azul" })).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Adicionar Boné bordado" }))

    expect(onChange).toHaveBeenCalledWith([...picks, { id: "novo", productId: "p3" }])
  })

  // A removed row takes its focused button with it; the focus lands on the row that took its place.
  it("keeps the focus in the list when a pick is taken out", async () => {
    const user = userEvent.setup()
    render(<Held initial={picks} />)

    await user.click(screen.getByRole("button", { name: "Tirar Calça jeans" }))
    expect(screen.getByRole("button", { name: "Tirar Blusa azul" })).toHaveFocus()

    await user.click(screen.getByRole("button", { name: "Tirar Blusa azul" }))
    expect(screen.getByLabelText("Buscar produto para adicionar")).toHaveFocus()
  })

  it("keeps an arrow reachable when it reaches the end of the list", () => {
    renderPicks()

    const up = screen.getByRole("button", { name: "Subir Calça jeans" })
    expect(up).toHaveAttribute("aria-disabled", "true")
    expect(up).not.toHaveAttribute("disabled")
  })

  it("says so when nothing is picked yet", () => {
    renderPicks([])

    expect(screen.getByText("Nenhum produto escolhido ainda.")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderPicks()

    await expectNoA11yViolations(container)
  })
})
