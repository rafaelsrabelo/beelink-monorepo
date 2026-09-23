// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { TargetFields, type TargetValue } from "./target-fields"

function value(over: Partial<TargetValue> = {}): TargetValue {
  return { target: "NONE", categoryId: "", productId: "", externalUrl: "", ...over }
}

function renderFields(current: TargetValue) {
  const onChange = vi.fn()
  render(
    <TargetFields
      idPrefix="strip"
      value={current}
      onChange={onChange}
      categories={[{ id: "cat-1", name: "Blusas" }]}
      products={[{ id: "prod-1", name: "Whey" }]}
    />,
  )
  return { onChange }
}

describe("TargetFields", () => {
  it("asks for nothing more when the thing goes nowhere", () => {
    renderFields(value())

    expect(screen.getByRole("combobox", { name: "Para onde leva" })).toHaveTextContent("Nenhum — só informativo")
    expect(screen.queryByRole("combobox", { name: "Categoria" })).not.toBeInTheDocument()
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
  })

  /** The picker shows a name and stores an id — what survives a rename. */
  it("shows the category by name when the thing points at one", () => {
    renderFields(value({ target: "CATEGORY", categoryId: "cat-1" }))

    expect(screen.getByRole("combobox", { name: "Categoria" })).toHaveTextContent("Blusas")
  })

  it("asks for an address only when the thing leaves the shop", () => {
    renderFields(value({ target: "EXTERNAL", externalUrl: "https://wa.me/55" }))

    expect(screen.getByRole("textbox", { name: "Endereço" })).toHaveValue("https://wa.me/55")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <TargetFields idPrefix="strip" value={value({ target: "PRODUCT", productId: "prod-1" })} onChange={vi.fn()} categories={[]} products={[{ id: "prod-1", name: "Whey" }]} />,
    )

    await expectNoA11yViolations(container)
  })
})
