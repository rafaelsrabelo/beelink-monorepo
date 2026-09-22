// React
import { useState } from "react"

// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

// Block
import type { ProductFormValues } from "./product-form-types"
import { expectNoA11yViolations } from "../../test/a11y"
import { ProductShippingFields } from "./product-shipping-fields"

const base: ProductFormValues = {
  name: "", slug: "", description: "", price: "", compareAtPrice: "", cost: "",
  categoryId: "", isAvailable: true, imageUrls: [], sku: "", barcode: "",
  trackStock: false, stock: "", weight: "", length: "", width: "", height: "",
}

function Controlled() {
  const [value, setValue] = useState(base)
  return <ProductShippingFields value={value} onChange={setValue} />
}

describe("ProductShippingFields", () => {
  it("names each side, because three identical boxes in a row name nothing", () => {
    render(<Controlled />)

    expect(screen.getByLabelText("Comprimento")).toBeInTheDocument()
    expect(screen.getByLabelText("Largura")).toBeInTheDocument()
    expect(screen.getByLabelText("Altura")).toBeInTheDocument()
  })

  it("takes the weight a carrier quotes on", async () => {
    render(<Controlled />)

    await userEvent.type(screen.getByLabelText("Peso"), "350")

    expect(screen.getByLabelText("Peso")).toHaveValue("350")
  })

  it("ties the refusal to the sides, where the rule is", () => {
    render(
      <ProductShippingFields
        value={base}
        onChange={() => {}}
        errors={{ length: { message: "Preencha os três." } }}
      />,
    )

    expect(screen.getByText("Preencha os três.")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<Controlled />)

    await expectNoA11yViolations(container)
  })
})
