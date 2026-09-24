// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { OptionSearch } from "./option-search"

const options = [
  { id: "1", name: "Blusas" },
  { id: "2", name: "Calças" },
  { id: "3", name: "Calçados" },
]

function renderSearch(over: Partial<Parameters<typeof OptionSearch>[0]> = {}) {
  const onPick = vi.fn()
  const { container } = render(
    <OptionSearch
      id="busca"
      label="Categoria"
      placeholder="Buscar categoria"
      options={options}
      emptyText="Nada com esse nome."
      onPick={onPick}
      {...over}
    />,
  )
  return { onPick, container }
}

describe("OptionSearch", () => {
  // Typed on a phone, where a cedilla is a long press away.
  it("narrows by what was typed, accents or not", async () => {
    const user = userEvent.setup()
    renderSearch()

    await user.type(screen.getByLabelText("Categoria"), "calca")

    expect(screen.getByRole("button", { name: "Calças" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Calçados" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Blusas" })).not.toBeInTheDocument()
  })

  it("marks the one chosen and hands a new choice back", async () => {
    const user = userEvent.setup()
    const { onPick } = renderSearch({ selectedId: "1" })

    expect(screen.getByRole("button", { name: "Blusas", pressed: true })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Calças" }))

    expect(onPick).toHaveBeenCalledWith("2")
  })

  it("leaves out what is already picked, and names each button for what it adds", () => {
    renderSearch({ exclude: ["1"], actionLabel: "Adicionar {name}" })

    expect(screen.queryByRole("button", { name: /Blusas/ })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Adicionar Calças" })).toBeInTheDocument()
  })

  it("says so when nothing matches", async () => {
    const user = userEvent.setup()
    renderSearch()

    await user.type(screen.getByLabelText("Categoria"), "sapato")

    expect(screen.getByText("Nada com esse nome.")).toBeInTheDocument()
  })

  // Inside the component's form, Enter would have saved the showcase to the live shop mid-search.
  it("never submits the form it sits in, and picks the one match left on Enter", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())
    const onPick = vi.fn()
    render(
      <form onSubmit={onSubmit}>
        <OptionSearch id="busca" label="Categoria" placeholder="" options={options} emptyText="" onPick={onPick} />
        <button type="submit">Salvar</button>
      </form>,
    )

    await user.type(screen.getByLabelText("Categoria"), "cal{Enter}")
    expect(onSubmit).not.toHaveBeenCalled()
    expect(onPick).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText("Categoria"), "cad{Enter}")
    expect(onPick).toHaveBeenCalledWith("3")
    expect(onSubmit).not.toHaveBeenCalled()
  })

  // The pressed "add" leaves the list; the focus goes back to the search rather than the sheet's top.
  it("puts the focus back in the search after an add", async () => {
    const user = userEvent.setup()
    renderSearch({ actionLabel: "Adicionar {name}" })

    await user.click(screen.getByRole("button", { name: "Adicionar Calças" }))

    expect(screen.getByLabelText("Categoria")).toHaveFocus()
  })

  it("draws grey rows while the options are on their way, and says so when they could not be read", () => {
    const { unmount } = render(
      <OptionSearch id="a" label="Categoria" placeholder="" options={[]} emptyText="Nada" onPick={vi.fn()} state="loading" />,
    )
    expect(screen.getByRole("status")).toHaveTextContent("Carregando a lista")
    expect(screen.queryByText("Nada")).not.toBeInTheDocument()
    unmount()

    render(<OptionSearch id="a" label="Categoria" placeholder="" options={[]} emptyText="Nada" onPick={vi.fn()} state="failed" />)
    expect(screen.getByRole("alert")).toHaveTextContent("Não deu para carregar a lista")
  })

  it("has no accessibility violations", async () => {
    const { container } = renderSearch({ selectedId: "2" })

    await expectNoA11yViolations(container)
  })
})
