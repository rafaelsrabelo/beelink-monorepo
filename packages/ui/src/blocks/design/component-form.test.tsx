// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { sampleColorPresets as presets } from "../store/store.fixtures"
import { ComponentForm, type ComponentFormValues } from "./component-form"

const page = presets[0]!.colors.background

function values(over: Partial<ComponentFormValues> = {}): ComponentFormValues {
  return {
    kind: "HEADING",
    title: "",
    subtitle: "",
    body: "",
  display: "CAROUSEL",
    columns: 0,
    align: "LEFT",
    background: "",
    target: "NONE",
    categoryId: "",
    productId: "",
    externalUrl: "",
    slides: [],
    benefits: [],
    fields: [],
    source: "ALL",
    sourceCategoryId: "",
    picks: [],
    limit: "",
    ...over,
  }
}

function renderForm(value: ComponentFormValues) {
  const onChange = vi.fn()
  const onSubmit = vi.fn()

  const view = render(
    <ComponentForm
      value={value}
      onChange={onChange}
      pageBackground={page}
      categories={[{ id: "cat-1", name: "Blusas" }]}
      products={[]}
      newItemId={() => "new"}
      onSubmit={onSubmit}
      onCancel={vi.fn()}
    />,
  )

  return { ...view, onChange, onSubmit }
}

describe("ComponentForm", () => {
  /**
   * The complaint that produced this block: some kinds had a form and some had none, and the ones
   * with none were reported as "não consigo editar". Every kind draws the fields it has.
   */
  it("draws a heading's title and subtitle, and no paragraph", () => {
    renderForm(values({ kind: "HEADING" }))

    expect(screen.getByLabelText("Título")).toBeInTheDocument()
    expect(screen.getByLabelText("Linha de apoio")).toBeInTheDocument()
    expect(screen.queryByLabelText("Texto")).not.toBeInTheDocument()
  })

  it("draws a paragraph's textarea and nothing a heading has", () => {
    renderForm(values({ kind: "TEXT" }))

    expect(screen.getByLabelText("Texto")).toBeInTheDocument()
    expect(screen.queryByLabelText("Título")).not.toBeInTheDocument()
  })

  it("offers a banner its format and a way to add a picture", () => {
    renderForm(values({ kind: "BANNER" }))

    expect(screen.getByRole("group", { name: "Formato" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Adicionar imagem" })).toBeInTheDocument()
  })

  it("offers the promises band a way to add a promise", () => {
    renderForm(values({ kind: "BENEFITS" }))

    expect(screen.getByRole("button", { name: "Adicionar vantagem" })).toBeInTheDocument()
  })

  /** The three asks in one: a heading and a paragraph align; the strip has a colour of its own. */
  it("offers alignment to a heading and a paragraph, and nothing else", () => {
    const { unmount } = renderForm(values({ kind: "TEXT", align: "RIGHT" }))
    expect(screen.getByRole("button", { name: "Direita", pressed: true })).toBeInTheDocument()
    unmount()

    renderForm(values({ kind: "BANNER" }))
    expect(screen.queryByRole("button", { name: "Direita" })).not.toBeInTheDocument()
  })

  it("offers the announcement bar its colour, in words when it has none", () => {
    renderForm(values({ kind: "ANNOUNCEMENT" }))

    expect(screen.getByRole("checkbox", { name: "Cor da barra" })).not.toBeChecked()
    expect(screen.getByText("A cor padrão, derivada da página.")).toBeInTheDocument()
  })

  it("offers the categories a rail or a grid, and the grid its columns", () => {
    renderForm(values({ kind: "CATEGORIES", display: "GRID" }))

    expect(screen.getByRole("button", { name: /Grade/, pressed: true })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Carrossel/ })).not.toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Colunas" })).toHaveTextContent("Automático")
  })

  // A rail's cards have their own width, so a column count there would change nothing.
  it("asks a rail of categories for no columns", async () => {
    const user = userEvent.setup()
    const { onChange } = renderForm(values({ kind: "CATEGORIES", display: "RAIL" }))

    expect(screen.queryByRole("combobox", { name: "Colunas" })).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /Grade/ }))

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ kind: "CATEGORIES", display: "GRID" }))
  })

  it("hands every keystroke back rather than holding it", async () => {
    const user = userEvent.setup()
    const { onChange } = renderForm(values({ kind: "HEADING" }))

    await user.type(screen.getByLabelText("Título"), "N")

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ title: "N" }))
  })

  it("submits on the save button", async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm(values({ kind: "HEADING", title: "Novidades" }))

    await user.click(screen.getByRole("button", { name: "Salvar" }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <ComponentForm
        value={values({ kind: "BANNER", slides: [{ id: "s", imageUrl: "", title: "", subtitle: "", target: "NONE", categoryId: "", productId: "", externalUrl: "" }] })}
        onChange={vi.fn()}
        pageBackground={page}
        categories={[]}
        products={[]}
        newItemId={() => "new"}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    await expectNoA11yViolations(container)
  })
})
