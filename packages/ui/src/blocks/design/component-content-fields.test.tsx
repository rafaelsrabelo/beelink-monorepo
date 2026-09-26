// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ComponentContentFields, contentReady, type ComponentFormValues } from "./component-content-fields"

function values(over: Partial<ComponentFormValues> = {}): ComponentFormValues {
  return {
    kind: "HEADING",
    title: "",
    subtitle: "",
    body: "",
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
    faq: [],
    ...over,
  }
}

/** Inside a form, as the inspector puts them: what Enter does in a field is part of the contract. */
function renderFields(value: ComponentFormValues) {
  const onChange = vi.fn()
  const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())

  const view = render(
    <form onSubmit={onSubmit}>
      <ComponentContentFields
        value={value}
        onChange={onChange}
        categories={[{ id: "cat-1", name: "Blusas" }]}
        products={[]}
        newItemId={() => "new"}
      />
    </form>,
  )

  return { ...view, onChange, onSubmit }
}

describe("ComponentContentFields", () => {
  /**
   * The complaint that produced this block: some kinds had a form and some had none, and the ones
   * with none were reported as "não consigo editar". Every kind draws the fields it has.
   */
  it("draws a heading's title and subtitle, and no paragraph", () => {
    renderFields(values({ kind: "HEADING" }))

    expect(screen.getByLabelText("Título")).toBeInTheDocument()
    expect(screen.getByLabelText("Linha de apoio")).toBeInTheDocument()
    expect(screen.queryByLabelText("Texto")).not.toBeInTheDocument()
  })

  it("offers a banner a way to add a picture", () => {
    renderFields(values({ kind: "BANNER" }))

    expect(screen.getByRole("button", { name: "Adicionar imagem" })).toBeInTheDocument()
  })

  it("offers the promises band a way to add a promise", () => {
    renderFields(values({ kind: "BENEFITS" }))

    expect(screen.getByRole("button", { name: "Adicionar vantagem" })).toBeInTheDocument()
  })

  // How a block sits is the Layout tab's, and the strip's colour is its band's, in Estilo.
  it("asks no format, columns, alignment or colour of any kind", () => {
    for (const kind of ["TEXT", "BANNER", "CATEGORIES", "PRODUCTS", "ANNOUNCEMENT"] as const) {
      const { unmount } = renderFields(values({ kind }))

      expect(screen.queryByRole("group", { name: /Formato|Alinhamento/ })).not.toBeInTheDocument()
      expect(screen.queryByRole("combobox", { name: "Colunas" })).not.toBeInTheDocument()
      expect(screen.queryByRole("checkbox", { name: /Cor/ })).not.toBeInTheDocument()
      unmount()
    }
  })

  it("asks the announcement bar its words and where it leads", () => {
    renderFields(values({ kind: "ANNOUNCEMENT" }))

    expect(screen.getByLabelText("Título")).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Para onde leva" })).toBeInTheDocument()
  })

  it("never saves a showcase from its search box", async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderFields(values({ kind: "PRODUCTS", source: "SELECTION", picks: [{ id: "a", productId: "p1" }] }))

    await user.type(screen.getByLabelText("Buscar produto para adicionar"), "vest{Enter}")

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("hands every keystroke back rather than holding it", async () => {
    const user = userEvent.setup()
    const { onChange } = renderFields(values({ kind: "HEADING" }))

    await user.type(screen.getByLabelText("Título"), "N")

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ kind: "HEADING", title: "N" }))
  })

  it("has no accessibility violations", async () => {
    const { container } = renderFields(
      values({ kind: "BANNER", slides: [{ id: "s", imageUrl: "", title: "", subtitle: "", target: "NONE", categoryId: "", productId: "", externalUrl: "" }] }),
    )

    await expectNoA11yViolations(container)
  })
})

describe("contentReady — a save the API would take", () => {
  // What the source needs is missing, so the save would only be a 400: Salvar says so first.
  it("holds a showcase until its source has what it needs", () => {
    expect(contentReady(values({ kind: "PRODUCTS", source: "CATEGORY" }))).toBe(false)
    expect(contentReady(values({ kind: "PRODUCTS", source: "SELECTION", picks: [{ id: "a", productId: "p1" }] }))).toBe(true)
  })

  it("holds a contact form nobody could be answered through", () => {
    expect(contentReady(values({ kind: "CONTACT", fields: [] }))).toBe(false)
    expect(
      contentReady(values({ kind: "CONTACT", fields: [{ id: "e", label: "E-mail", type: "EMAIL", required: true, options: "" }] })),
    ).toBe(true)
  })

  it("holds a FAQ while a question it asks has no answer", () => {
    expect(contentReady(values({ kind: "FAQ", faq: [{ id: "a", question: "Prazo?", answer: " " }] }))).toBe(false)
    expect(contentReady(values({ kind: "FAQ", faq: [{ id: "a", question: "Prazo?", answer: "Três dias." }] }))).toBe(true)
    // A row not written yet is dropped on the way out, not waited for.
    expect(contentReady(values({ kind: "FAQ", faq: [{ id: "a", question: "", answer: "" }] }))).toBe(true)
  })

  it("takes every other kind as it is", () => {
    expect(contentReady(values({ kind: "HEADING" }))).toBe(true)
  })
})
