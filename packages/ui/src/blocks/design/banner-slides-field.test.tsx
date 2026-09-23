// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { BannerSlidesField, type SlideValue } from "./banner-slides-field"

function slide(id: string, over: Partial<SlideValue> = {}): SlideValue {
  return {
    id,
    imageUrl: `/${id}.jpg`,
    title: id,
    subtitle: "",
    target: "NONE",
    categoryId: "",
    productId: "",
    externalUrl: "",
    ...over,
  }
}

function renderField(value: SlideValue[]) {
  const onChange = vi.fn()

  render(
    <BannerSlidesField
      value={value}
      onChange={onChange}
      categories={[{ id: "cat-1", name: "Blusas" }]}
      products={[{ id: "prod-1", name: "Whey" }]}
      newSlideId={() => "new"}
    />,
  )

  return { onChange }
}

describe("BannerSlidesField", () => {
  it("adds a picture that points nowhere, with the id the screen minted", async () => {
    const user = userEvent.setup()
    const { onChange } = renderField([])

    await user.click(screen.getByRole("button", { name: "Adicionar imagem" }))

    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ id: "new", target: "NONE", imageUrl: "" })])
  })

  it("moves a picture down, and cannot move the last one further", async () => {
    const user = userEvent.setup()
    const { onChange } = renderField([slide("a"), slide("b")])

    await user.click(screen.getByRole("button", { name: "Descer: Imagem 1 de 2" }))

    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ id: "b" }), expect.objectContaining({ id: "a" })])
    expect(screen.getByRole("button", { name: "Descer: Imagem 2 de 2" })).toBeDisabled()
  })

  it("removes one picture and keeps the rest", async () => {
    const user = userEvent.setup()
    const { onChange } = renderField([slide("a"), slide("b")])

    await user.click(screen.getByRole("button", { name: "Excluir: Imagem 1 de 2" }))

    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ id: "b" })])
  })

  /** The picker is over what survives a rename: it shows the name, and the value is the id. */
  it("asks for a category only when the picture points at one", () => {
    renderField([slide("a", { target: "CATEGORY", categoryId: "cat-1" }), slide("b")])

    expect(screen.getByRole("combobox", { name: "Categoria" })).toHaveTextContent("Blusas")
    expect(screen.getAllByRole("combobox", { name: "Categoria" })).toHaveLength(1)
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <BannerSlidesField
        value={[slide("a", { target: "EXTERNAL", externalUrl: "https://wa.me/55" })]}
        onChange={vi.fn()}
        categories={[]}
        products={[]}
        newSlideId={() => "new"}
      />,
    )

    await expectNoA11yViolations(container)
  })
})
