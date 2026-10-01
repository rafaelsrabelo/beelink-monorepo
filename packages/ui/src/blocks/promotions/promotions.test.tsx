// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { DiscountAudienceField } from "./discount-audience-field"
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
    expect(screen.getAllByText("Ativa")).toHaveLength(2)
    expect(screen.getByText("Agendada")).toBeInTheDocument()
    expect(screen.getByText("Pausada")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Editar a promoção Semana do Consumidor" }))
    expect(onEdit).toHaveBeenCalledWith(promotionRows[0])
    await userEvent.click(screen.getByRole("button", { name: "Pausar a promoção Semana do Consumidor" }))
    expect(onToggle).toHaveBeenCalledWith(promotionRows[0])
    // One the owner switched off offers the way back on.
    expect(screen.getByRole("button", { name: "Religar a promoção Queima de estoque" })).toHaveTextContent("Religar")
  })

  it("marks the one that is for a first purchase only, beside what it takes off, and no other", () => {
    render(<PromotionList rows={promotionRows} empty="none" onEdit={() => {}} onToggle={() => {}} />)

    expect(screen.getByText("Boas-vindas").closest("li")).toHaveTextContent(/15% no carrinho inteiro\s*Primeira compra/)
    expect(screen.getAllByText("Primeira compra")).toHaveLength(1)
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

    // The button pressed is gone with its row: the focus goes to the search, not to the page.
    expect(screen.getByRole("searchbox", { name: "Buscar produto" })).toHaveFocus()

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

  it("never says the shop has no categories while they are read, or when the read failed", async () => {
    const byCategory = { ...promotionValues, scope: "CATEGORIES" as const }
    const { rerender } = render(<PromotionForm {...formProps({ value: byCategory, categories: null })} />)
    expect(screen.queryByText("A loja ainda não tem categorias.")).not.toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()

    const onRetryCategories = vi.fn()
    rerender(<PromotionForm {...formProps({ value: byCategory, categories: null, onRetryCategories })} />)
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar a lista.")
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))
    expect(onRetryCategories).toHaveBeenCalledOnce()

    rerender(<PromotionForm {...formProps({ value: byCategory, categories: [] })} />)
    expect(screen.getByText("A loja ainda não tem categorias.")).toBeInTheDocument()
  })

  it("says why no more products go in once it names as many as a promotion takes", () => {
    const products = Array.from({ length: 200 }, (_, index) => ({ id: `p${index}`, name: `Produto ${index}` }))
    render(<PromotionForm {...formProps({ value: { ...promotionValues, products }, productResults: [{ id: "novo", name: "Mais um" }] })} />)
    expect(screen.getByRole("button", { name: "Escolher Mais um" })).toBeDisabled()
    expect(screen.getByText("Uma promoção vale para até 200 produtos.")).toBeInTheDocument()
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

  it("asks who the promotion is for, and changes it with the rest of what was filled in", async () => {
    const props = formProps()
    const { container, rerender } = render(<PromotionForm {...props} />)

    expect(screen.getByRole("button", { name: "Todos os clientes" })).toHaveAttribute("aria-pressed", "true")
    await userEvent.click(screen.getByRole("button", { name: "Só na primeira compra" }))
    expect(props.onChange).toHaveBeenLastCalledWith({ ...promotionValues, audience: "FIRST_PURCHASE" })

    rerender(<PromotionForm {...formProps({ value: { ...promotionValues, audience: "FIRST_PURCHASE" } })} />)
    expect(screen.getByRole("button", { name: "Só na primeira compra" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByText("Vale para quem ainda não tem nenhum pedido na loja. Pedido cancelado não conta.")).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it("says each field to correct and the refusal of the whole save, and sends or cancels", async () => {
    const props = formProps({ issues: { name: "Preencha este campo.", endsAt: "O fim precisa ser depois do início." }, error: "Um produto escolhido não é mais desta loja." })
    render(<PromotionForm {...props} />)

    expect(screen.getByLabelText("Nome")).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByText("Preencha este campo.")).toBeInTheDocument()
    expect(screen.getByText("O fim precisa ser depois do início.")).toBeInTheDocument()
    expect(screen.getByText("Um produto escolhido não é mais desta loja.")).toBeInTheDocument()

    expect(screen.getByLabelText("Nome")).toHaveAccessibleDescription("Preencha este campo.")
    expect(screen.getByLabelText("Termina em")).toHaveAccessibleDescription("O fim precisa ser depois do início.")
    expect(screen.getByLabelText("Começa em")).toHaveAccessibleDescription("No horário de Brasília.")

    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(props.onSubmit).toHaveBeenCalledExactlyOnceWith({ startsAt: false, endsAt: false })
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

describe("DiscountAudienceField", () => {
  const help = "Vale para quem ainda não tem nenhum pedido na loja. Pedido cancelado não conta."

  it("shows who it is for, and hands the other choice to the form", async () => {
    const onChange = vi.fn()
    render(<DiscountAudienceField audience="EVERYONE" onChange={onChange} />)

    const choice = within(screen.getByRole("group", { name: "Para quem vale" }))
    expect(choice.getByRole("button", { name: "Todos os clientes" })).toHaveAttribute("aria-pressed", "true")
    expect(choice.getByRole("button", { name: "Só na primeira compra" })).toHaveAttribute("aria-pressed", "false")

    await userEvent.click(choice.getByRole("button", { name: "Só na primeira compra" }))
    expect(onChange).toHaveBeenCalledExactlyOnceWith({ audience: "FIRST_PURCHASE" })

    // Pressing the chosen one again leaves it chosen: a discount is always for someone.
    await userEvent.click(choice.getByRole("button", { name: "Todos os clientes" }))
    expect(onChange).toHaveBeenCalledOnce()
  })

  it("says what counts as a first purchase once that is the choice, as the description of that option alone", async () => {
    const { container, rerender } = render(<DiscountAudienceField audience="FIRST_PURCHASE" onChange={() => {}} />)

    expect(screen.getByRole("button", { name: "Só na primeira compra" })).toHaveAccessibleDescription(help)
    expect(screen.getByRole("button", { name: "Todos os clientes" })).not.toHaveAccessibleDescription()
    await expectNoA11yViolations(container)

    // Under "everyone" the sentence would read as what that choice means.
    rerender(<DiscountAudienceField audience="EVERYONE" onChange={() => {}} />)
    expect(screen.queryByText(help)).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Só na primeira compra" })).not.toHaveAccessibleDescription()
    await expectNoA11yViolations(container)
  })

  /** A region born with its sentence is not announced: this one is there from the first draw, empty. */
  it("has its live region in the page before the first purchase is chosen, so the sentence is heard arriving", () => {
    const { container, rerender } = render(<DiscountAudienceField audience="EVERYONE" onChange={() => {}} />)
    const region = container.querySelector("[aria-live='polite']")!
    expect(region).toBeEmptyDOMElement()

    rerender(<DiscountAudienceField audience="FIRST_PURCHASE" onChange={() => {}} />)
    expect(container.querySelector("[aria-live='polite']")).toBe(region)
    expect(region).toHaveTextContent(help)
  })

  it("waits while the form is being saved", () => {
    render(<DiscountAudienceField audience="EVERYONE" onChange={() => {}} disabled />)

    for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled()
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
