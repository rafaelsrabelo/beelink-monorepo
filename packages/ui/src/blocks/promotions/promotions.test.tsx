// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { DiscountFailed } from "./discount-failed"
import { DiscountListSkeleton } from "./discount-list-skeleton"
import { DiscountStatusTabs } from "./discount-status-tabs"
import { PromotionForm, type PromotionFormProps } from "./promotion-form"
import { PromotionList } from "./promotion-list"
import { categoryOptions, promotionRows, promotionValues } from "./promotions.fixtures"

describe("DiscountStatusTabs", () => {
  it("offers every status with its count as a link, marks the one chosen, and leaves a count out while the list is read", async () => {
    const { container } = render(
      <DiscountStatusTabs
        tabs={[
          { key: "ALL", label: "Todas", href: "?", active: false },
          { key: "ACTIVE", label: "Ativas", count: 2, href: "?situacao=ativas", active: true },
        ]}
      />,
    )

    expect(within(screen.getByRole("navigation", { name: "Situação" })).getAllByRole("link")).toHaveLength(2)
    expect(screen.getByRole("link", { name: "Todas" })).not.toHaveAttribute("aria-current")
    expect(screen.getByRole("link", { name: "Ativas (2)" })).toHaveAttribute("aria-current", "true")
    expect(screen.getByRole("link", { name: "Ativas (2)" })).toHaveAttribute("href", "?situacao=ativas")
    await expectNoA11yViolations(container)
  })
})

describe("PromotionList", () => {
  it("reads each promotion — what it takes off, its period and where it stands — and edits or pauses it", async () => {
    const onEdit = vi.fn()
    const onToggle = vi.fn()
    render(<PromotionList rows={promotionRows} empty="none" onEdit={onEdit} onToggle={onToggle} />)

    expect(screen.getByText("10% no carrinho inteiro")).toBeInTheDocument()
    expect(screen.getByText("De 1 out 2026 a 15 out 2026")).toBeInTheDocument()
    expect(screen.getByText("Ativa")).toBeInTheDocument()
    expect(screen.getByText("Agendada")).toBeInTheDocument()
    expect(screen.getByText("Pausada")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Editar a promoção Semana do Consumidor" }))
    expect(onEdit).toHaveBeenCalledWith(promotionRows[0])
    await userEvent.click(screen.getByRole("button", { name: "Pausar a promoção Semana do Consumidor" }))
    expect(onToggle).toHaveBeenCalledWith(promotionRows[0])
    // One the owner switched off offers the way back on.
    expect(screen.getByRole("button", { name: "Religar a promoção Queima de estoque" })).toHaveTextContent("Religar")
  })

  it("holds every button while one pause is on its way", () => {
    render(<PromotionList rows={promotionRows} empty="none" busyId="p1" onEdit={() => {}} onToggle={() => {}} />)
    for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled()
    expect(screen.getByRole("button", { name: "Pausar a promoção Semana do Consumidor" })).toHaveAttribute("aria-busy", "true")
  })

  it("says why it is empty: none yet, or none in the status chosen", () => {
    const { rerender } = render(<PromotionList rows={[]} empty="none" onEdit={() => {}} onToggle={() => {}} />)
    expect(screen.getByText("Nenhuma promoção ainda.")).toBeInTheDocument()

    rerender(<PromotionList rows={[]} empty="filtered" onEdit={() => {}} onToggle={() => {}} />)
    expect(screen.getByText("Nenhuma promoção nesta situação.")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<PromotionList rows={promotionRows} empty="none" onEdit={() => {}} onToggle={() => {}} />)
    await expectNoA11yViolations(container)
  })
})

function formProps(overrides: Partial<PromotionFormProps> = {}): PromotionFormProps {
  return {
    value: promotionValues,
    onChange: vi.fn(),
    productQuery: "",
    onProductQueryChange: vi.fn(),
    productResults: [
      { id: "w1", name: "Whey Protein Isolado 900g" },
      { id: "w2", name: "Creatina 300g" },
    ],
    categories: categoryOptions,
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  }
}

describe("PromotionForm", () => {
  it("shows the products of a PRODUCTS scope: the chosen ones leave the results, and each goes in or out", async () => {
    const props = formProps()
    render(<PromotionForm {...props} />)

    // Already chosen: not offered again.
    expect(screen.queryByRole("button", { name: "Escolher Whey Protein Isolado 900g" })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Escolher Creatina 300g" }))
    expect(props.onChange).toHaveBeenLastCalledWith({ ...promotionValues, products: [...promotionValues.products, { id: "w2", name: "Creatina 300g" }] })

    await userEvent.click(screen.getByRole("button", { name: "Tirar Whey Protein Isolado 900g" }))
    expect(props.onChange).toHaveBeenLastCalledWith({ ...promotionValues, products: [] })

    await userEvent.type(screen.getByRole("searchbox", { name: "Buscar produto" }), "c")
    expect(props.onProductQueryChange).toHaveBeenCalledWith("c")
    // No list of categories on a PRODUCTS scope.
    expect(screen.queryByRole("checkbox", { name: "Proteínas" })).not.toBeInTheDocument()
  })

  it("shows the shop's categories on a CATEGORIES scope, says a category covers what sits under it, and none of either on a CART", async () => {
    const props = formProps({ value: { ...promotionValues, scope: "CATEGORIES", categoryIds: ["k1"] } })
    const { rerender } = render(<PromotionForm {...props} />)

    expect(screen.getByRole("checkbox", { name: "Proteínas" })).toBeChecked()
    expect(screen.getByText("A promoção de uma categoria vale também para as subcategorias dela.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("checkbox", { name: "Whey" }))
    expect(props.onChange).toHaveBeenLastCalledWith(expect.objectContaining({ categoryIds: ["k1", "k2"] }))
    await userEvent.click(screen.getByRole("checkbox", { name: "Proteínas" }))
    expect(props.onChange).toHaveBeenLastCalledWith(expect.objectContaining({ categoryIds: [] }))

    rerender(<PromotionForm {...formProps({ value: { ...promotionValues, scope: "CART" } })} />)
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument()
  })

  it("asks for the one value its kind carries, and says what a fixed amount comes off", async () => {
    const { rerender } = render(<PromotionForm {...formProps({ value: { ...promotionValues, kind: "FIXED", amount: "15,00" } })} />)

    expect(screen.getByLabelText("Valor (R$)")).toHaveValue("15,00")
    expect(screen.queryByLabelText("Percentual (%)")).not.toBeInTheDocument()
    expect(screen.getByText("O valor sai de cada unidade do produto.")).toBeInTheDocument()

    const cart = formProps({ value: { ...promotionValues, scope: "CART", kind: "FIXED", amount: "15,00" } })
    rerender(<PromotionForm {...cart} />)
    expect(screen.getByText("O valor sai do carrinho inteiro, uma vez.")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Percentual" }))
    expect(cart.onChange).toHaveBeenLastCalledWith({ ...cart.value, kind: "PERCENT" })
  })

  it("says each field to correct and the refusal of the whole save, and sends or cancels", async () => {
    const props = formProps({ issues: { name: "Preencha este campo.", endsAt: "O fim precisa ser depois do início." }, error: "Um produto escolhido não é mais desta loja." })
    render(<PromotionForm {...props} />)

    expect(screen.getByLabelText("Nome")).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByText("Preencha este campo.")).toBeInTheDocument()
    expect(screen.getByText("O fim precisa ser depois do início.")).toBeInTheDocument()
    expect(screen.getByText("Um produto escolhido não é mais desta loja.")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(props.onSubmit).toHaveBeenCalledOnce()
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(props.onCancel).toHaveBeenCalledOnce()
  })

  it("has no accessibility violations, by products and by categories", async () => {
    const products = render(<PromotionForm {...formProps()} />)
    await expectNoA11yViolations(products.container)
    products.unmount()

    const categories = render(<PromotionForm {...formProps({ value: { ...promotionValues, scope: "CATEGORIES" } })} />)
    await expectNoA11yViolations(categories.container)
  })
})

describe("DiscountFailed and DiscountListSkeleton", () => {
  it("says the read failed and asks again; the skeleton is hidden from readers", async () => {
    const onRetry = vi.fn()
    const failed = render(<DiscountFailed onRetry={onRetry} />)
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar a lista.")
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))
    expect(onRetry).toHaveBeenCalledOnce()
    await expectNoA11yViolations(failed.container)

    const { container } = render(<DiscountListSkeleton />)
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true")
    await expectNoA11yViolations(container)
  })
})
