// React
import { useState } from "react"

// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { EMPTY_PRODUCT, type ProductFormIssues, type ProductFormValues } from "./product-form-types"
import { ProductKitFields } from "./product-kit-fields"

const categories = [
  { id: "c1", name: "Dindins" },
  { id: "c2", name: "Trufados", parentName: "Dindins" },
  { id: "c3", name: "Bebidas" },
]

function Controlled({ start = EMPTY_PRODUCT, onChange, errors }: { start?: ProductFormValues; onChange?: (value: ProductFormValues) => void; errors?: ProductFormIssues }) {
  const [value, setValue] = useState(start)
  return (
    <ProductKitFields
      value={value}
      onChange={(next) => {
        setValue(next)
        onChange?.(next)
      }}
      categories={categories}
      {...(errors ? { errors } : {})}
    />
  )
}

describe("ProductKitFields", () => {
  it("asks nothing more until the product is a kit, and says what a kit is", () => {
    render(<Controlled />)

    const toggle = screen.getByRole("switch", { name: "Este produto é um kit" })
    expect(toggle).not.toBeChecked()
    expect(toggle).toHaveAccessibleDescription(/O cliente monta o kit na página do produto/)
    expect(screen.queryByLabelText("Quantos itens o cliente escolhe")).toBeNull()
  })

  it("switched on, asks how many items and lets every product in — and switches the product's own stock count off", async () => {
    const onChange = vi.fn()
    render(<Controlled start={{ ...EMPTY_PRODUCT, trackStock: true }} onChange={onChange} />)

    await userEvent.click(screen.getByRole("switch", { name: "Este produto é um kit" }))
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ isKit: true, trackStock: false }))

    await userEvent.type(screen.getByLabelText("Quantos itens o cliente escolhe"), "2a0")
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ kitSize: "20" }))
    expect(screen.getByRole("radio", { name: "Todos os produtos da loja" })).toBeChecked()
    expect(screen.queryByRole("checkbox")).toBeNull()
  })

  it("names the categories that go in, or the ones left out, ticked one by one", async () => {
    const onChange = vi.fn()
    render(<Controlled start={{ ...EMPTY_PRODUCT, isKit: true, kitSize: "20" }} onChange={onChange} />)

    await userEvent.click(screen.getByRole("radio", { name: "Todos, menos estas categorias" }))
    expect(screen.getByRole("group", { name: "Categorias que ficam de fora" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("checkbox", { name: "Bebidas" }))
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ kitScope: "EXCEPT", kitCategoryIds: ["c3"] }))

    await userEvent.click(screen.getByRole("radio", { name: "Só destas categorias" }))
    expect(screen.getByRole("group", { name: "Categorias que entram no kit" })).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: "Dindins › Trufados" })).not.toBeChecked()
  })

  it("says what is missing on each field", () => {
    render(
      <Controlled
        start={{ ...EMPTY_PRODUCT, isKit: true, kitScope: "ONLY" }}
        errors={{ kitSize: { message: "Informe um número de 2 a 99." }, kitCategoryIds: { message: "Marque pelo menos uma categoria." } }}
      />,
    )

    expect(screen.getByLabelText("Quantos itens o cliente escolhe")).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByText("Informe um número de 2 a 99.")).toBeInTheDocument()
    expect(screen.getByText("Marque pelo menos uma categoria.")).toBeInTheDocument()
  })

  it("has no accessibility violations, off and on", async () => {
    const { container, rerender } = render(<ProductKitFields value={EMPTY_PRODUCT} onChange={() => {}} categories={categories} />)
    await expectNoA11yViolations(container)

    rerender(<ProductKitFields value={{ ...EMPTY_PRODUCT, isKit: true, kitSize: "20", kitScope: "EXCEPT", kitCategoryIds: ["c3"] }} onChange={() => {}} categories={categories} />)
    await expectNoA11yViolations(container)
  })
})
