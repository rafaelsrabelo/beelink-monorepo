// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Lib
import { EMPTY_VARIATIONS } from "../../lib/variations"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ProductEditor, type ProductEditorProps } from "./product-editor"
import { EMPTY_PRODUCT } from "./product-form-types"
import { BLOUSE, WHEY, WHEY_PHOTOS } from "./variation-fixtures"

function renderEditor(overrides: Partial<ProductEditorProps> = {}) {
  const props: ProductEditorProps = {
    value: { ...EMPTY_PRODUCT, name: "Blusa", price: "189,00" },
    onChange: vi.fn(),
    categories: [],
    shopSlug: "lessari",
    productsWord: "produtos",
    onUploadImage: vi.fn(async () => "https://cdn/x.png"),
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    submitLabel: "Salvar",
    ...overrides,
  }
  return { props, ...render(<ProductEditor {...props} />) }
}

describe("ProductEditor", () => {
  it("draws the variations between the price and the stock", () => {
    renderEditor({ variations: { value: EMPTY_VARIATIONS, onChange: () => {} } })

    const headings = screen.getAllByRole("heading").map((heading) => heading.textContent)
    expect(headings.indexOf("Variações")).toBe(headings.indexOf("Preço") + 1)
    expect(headings.indexOf("Estoque")).toBe(headings.indexOf("Variações") + 1)
  })

  it("keeps the price fields while the product sells one thing", () => {
    renderEditor({ variations: { value: EMPTY_VARIATIONS, onChange: () => {} } })

    expect(screen.getByLabelText(/Preço/, { selector: "#product-price" })).toBeInTheDocument()
  })

  it("hands price, stock and codes to the combinations once there are any", () => {
    renderEditor({ variations: { value: BLOUSE, onChange: () => {} } })

    expect(document.querySelector("#product-price")).toBeNull()
    expect(document.querySelector("#product-sku")?.closest(".hidden")).not.toBeNull()
    expect(screen.getAllByText(/o preço e o estoque ficam em cada combinação/)).toHaveLength(2)
    // Whether the shop counts stays a product-wide switch.
    expect(screen.getByRole("checkbox", { name: "Controlar estoque" })).toBeInTheDocument()
  })

  it("leaves without asking when nothing is unsaved", async () => {
    const user = userEvent.setup()
    const { props } = renderEditor()

    await user.click(screen.getByRole("button", { name: "Cancelar" }))

    expect(props.onCancel).toHaveBeenCalled()
  })

  it("says an edit is unsaved, and asks before Cancel throws it away", async () => {
    const user = userEvent.setup()
    const { props } = renderEditor({ dirty: true })

    expect(screen.getByText("Você tem alterações não salvas.")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Cancelar" }))
    const question = await screen.findByRole("alertdialog", { name: "Sair sem salvar?" })

    await user.click(within(question).getByRole("button", { name: "Continuar editando" }))
    expect(props.onCancel).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Cancelar" }))
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Descartar" }))
    expect(props.onCancel).toHaveBeenCalled()
  })

  // The whole editor with its variations is the largest tree axe walks here: well under a second on
  // an idle machine, past the default 5s while the push hook runs every suite at once.
  it("has no accessibility violations with its variations", { timeout: 20_000 }, async () => {
    const { container } = renderEditor({ variations: { value: BLOUSE, onChange: () => {} }, dirty: true })

    await expectNoA11yViolations(container)
  })

  it("asks what each photo is of once the product has combinations, and marks it in the variations", async () => {
    const user = userEvent.setup()
    const onVariations = vi.fn()
    renderEditor({
      value: { ...EMPTY_PRODUCT, name: "Whey", imageUrls: WHEY_PHOTOS },
      variations: { value: WHEY, onChange: onVariations },
    })

    expect(screen.getByRole("button", { name: "Foto 1 aparece em: Todas as variações. Alterar" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /Foto 1 aparece em/ }))
    await user.click(within(screen.getByRole("group", { name: "Sabor" })).getByRole("button", { name: "Chocolate" }))

    expect(onVariations).toHaveBeenLastCalledWith(
      expect.objectContaining({ photos: expect.objectContaining({ [WHEY_PHOTOS[0]!]: ["Chocolate"] }) }),
    )
  })

  it("asks nothing of the photos while the product sells one thing", () => {
    renderEditor({ value: { ...EMPTY_PRODUCT, name: "Whey", imageUrls: WHEY_PHOTOS }, variations: { value: EMPTY_VARIATIONS, onChange: () => {} } })

    expect(screen.queryByRole("button", { name: /aparece em/ })).toBeNull()
  })
})
