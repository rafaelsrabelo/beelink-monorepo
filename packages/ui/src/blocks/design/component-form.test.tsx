// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ComponentForm, type ComponentFormValues } from "./component-form"

function values(over: Partial<ComponentFormValues> = {}): ComponentFormValues {
  return {
    kind: "HEADING",
    title: "",
    subtitle: "",
    body: "",
    layout: "FULL",
    columns: 0,
    slides: [],
    benefits: [],
    ...over,
  }
}

function renderForm(value: ComponentFormValues) {
  const onChange = vi.fn()
  const onSubmit = vi.fn()

  render(
    <ComponentForm
      value={value}
      onChange={onChange}
      categories={[{ id: "cat-1", name: "Blusas" }]}
      products={[]}
      newItemId={() => "new"}
      onSubmit={onSubmit}
      onCancel={vi.fn()}
    />,
  )

  return { onChange, onSubmit }
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

  it("offers a banner its size and a way to add a picture", () => {
    renderForm(values({ kind: "BANNER" }))

    expect(screen.getByRole("combobox", { name: "Tamanho" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Adicionar imagem" })).toBeInTheDocument()
  })

  it("offers the promises band a way to add a promise", () => {
    renderForm(values({ kind: "BENEFITS" }))

    expect(screen.getByRole("button", { name: "Adicionar vantagem" })).toBeInTheDocument()
  })

  it("offers the categories grid its columns", () => {
    renderForm(values({ kind: "CATEGORIES" }))

    expect(screen.getByRole("combobox", { name: "Colunas" })).toHaveTextContent("Automático")
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
