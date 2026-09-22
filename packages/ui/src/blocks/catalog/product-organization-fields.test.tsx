// React
import { useState } from "react"

// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import type { ProductFormValues } from "./product-form-types"
import { expectNoA11yViolations } from "../../test/a11y"
import { ProductOrganizationFields } from "./product-organization-fields"

const categories = [
  { id: "c1", name: "Proteínas" },
  { id: "c2", name: "Blusas", parentName: "Roupas" },
]

const base: ProductFormValues = {
  name: "", slug: "", description: "", price: "", compareAtPrice: "", cost: "",
  categoryId: "", status: "ACTIVE", origin: "", imageUrls: [], sku: "", barcode: "",
  trackStock: false, stock: "", weight: "", length: "", width: "", height: "",
}

function Controlled({ onCreateCategory }: { onCreateCategory?: (name: string) => Promise<string> }) {
  const [value, setValue] = useState(base)

  return (
    <ProductOrganizationFields
      value={value}
      onChange={setValue}
      categories={categories}
      onCreateCategory={onCreateCategory}
    />
  )
}

describe("ProductOrganizationFields", () => {
  // The trigger showed the sentinel, "none", because Base UI renders the raw value unless it is
  // told how to read it. The words a shopkeeper sees are never a value from the code.
  it("says the words, not the value, when nothing is filed", () => {
    render(<Controlled />)

    expect(screen.getByLabelText("Categoria")).toHaveTextContent("Sem categoria")
  })

  it("offers no way to create one when the screen cannot", () => {
    render(<Controlled />)

    expect(screen.queryByRole("button", { name: "Criar categoria" })).not.toBeInTheDocument()
  })

  /*
    A shopkeeper writing their first product has no categories yet, and sending them to another
    screen to make one is where a half-written product gets abandoned.
  */
  it("creates a category and files the product in it, without leaving", async () => {
    const onCreateCategory = vi.fn(async () => "c3")
    render(<Controlled onCreateCategory={onCreateCategory} />)

    await userEvent.click(screen.getByRole("button", { name: "Criar categoria" }))
    await userEvent.type(screen.getByLabelText("Criar categoria"), "Suplementos")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))

    expect(onCreateCategory).toHaveBeenCalledWith("Suplementos")
  })

  // Enter inside the category name must not submit the product being written around it.
  it("does not submit the product when naming a category", async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())
    const onCreateCategory = vi.fn(async () => "c3")
    render(
      <form onSubmit={onSubmit}>
        <Controlled onCreateCategory={onCreateCategory} />
      </form>,
    )

    await userEvent.click(screen.getByRole("button", { name: "Criar categoria" }))
    await userEvent.type(screen.getByLabelText("Criar categoria"), "Suplementos{Enter}")

    expect(onSubmit).not.toHaveBeenCalled()
    expect(onCreateCategory).toHaveBeenCalledWith("Suplementos")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<Controlled onCreateCategory={async () => "c3"} />)

    await expectNoA11yViolations(container)
  })
})
