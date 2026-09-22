// React
import { useState } from "react"

// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

// Block
import type { ProductFormValues } from "./product-form-types"
import { expectNoA11yViolations } from "../../test/a11y"
import { ProductInventoryFields } from "./product-inventory-fields"

const base: ProductFormValues = {
  name: "", slug: "", description: "", price: "", compareAtPrice: "", cost: "",
  categoryId: "", status: "ACTIVE", origin: "", imageUrls: [], sku: "", barcode: "",
  trackStock: false, stock: "", weight: "", length: "", width: "", height: "",
}

function Controlled() {
  const [value, setValue] = useState(base)
  return <ProductInventoryFields value={value} onChange={setValue} />
}

describe("ProductInventoryFields", () => {
  /*
    Counting is off by default and the quantity only exists while it is on. Most shops here sell
    made to order, and a quantity of zero on a product nobody counts would take it out of the shop
    window for no reason — which is why "not counted" and "none left" are two states.
  */
  it("hides the count until the shop says it counts", async () => {
    render(<Controlled />)

    expect(screen.queryByLabelText("Quantidade")).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("checkbox", { name: "Controlar estoque" }))

    expect(screen.getByLabelText("Quantidade")).toBeInTheDocument()
  })

  it("keeps the code fields, which do not depend on counting", () => {
    render(<Controlled />)

    expect(screen.getByLabelText("SKU")).toBeInTheDocument()
    expect(screen.getByLabelText("Código de barras")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<Controlled />)

    await expectNoA11yViolations(container)
  })
})
