// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { OrderCustomerSection } from "./order-customer-section"
import { OrderDetailsFields } from "./order-details-fields"
import { customers, lines, money, products, variants } from "./order-form.fixtures"
import type { OrderDetailsValues } from "@harness-monorepo/ui/lib/order-form"
import { OrderLines } from "./order-lines"
import { OrderProductPicker } from "./order-product-picker"
import { OrderSummary } from "./order-summary"

const noop = () => {}

function customerSection(overrides: Partial<Parameters<typeof OrderCustomerSection>[0]> = {}) {
  return (
    <OrderCustomerSection
      selected={null}
      onSelect={noop}
      onClear={noop}
      search={{ query: "Bia", onQueryChange: noop, results: customers }}
      create={{ onSubmit: noop }}
      {...overrides}
    />
  )
}

const details: OrderDetailsValues = { fulfillment: "DELIVERY", deliveryFee: "", paymentMethod: null, discount: "", note: "", placedOn: "2026-09-25" }

describe("the new order's customer", () => {
  it("offers the shop's customers the search found, and chooses one", async () => {
    const onSelect = vi.fn()
    render(customerSection({ onSelect }))

    await userEvent.click(screen.getByRole("button", { name: /Bianca Lima/ }))
    expect(onSelect).toHaveBeenCalledWith(customers[1])
  })

  it("registers a customer from what was searched, refusing a short name and a phone with no area code", async () => {
    const onSubmit = vi.fn()
    render(customerSection({ search: { query: "Rita", onQueryChange: noop, results: [] }, create: { onSubmit } }))

    await userEvent.click(screen.getByRole("button", { name: "Cadastrar cliente" }))
    expect(screen.getByLabelText("Nome")).toHaveValue("Rita")

    await userEvent.type(screen.getByLabelText("Celular"), "98888-7777{Enter}")
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText("Digite o celular com DDD, como (11) 98888-7777.")).toBeInTheDocument()

    await userEvent.clear(screen.getByLabelText("Celular"))
    await userEvent.type(screen.getByLabelText("Celular"), "(11) 98888-7777{Enter}")
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: "Rita", phone: "(11) 98888-7777" }))
  })

  it("offers the customer who already has the phone instead of a second one", async () => {
    const onSelect = vi.fn()
    render(
      customerSection({
        onSelect,
        search: { query: "11988887777", onQueryChange: noop, results: [] },
        create: { onSubmit: noop, error: "Esse celular já é de um cliente da loja.", existing: customers[0]! },
      }),
    )

    await userEvent.click(screen.getByRole("button", { name: "Cadastrar cliente" }))
    expect(screen.getByLabelText("Celular")).toHaveValue("11988887777")
    await userEvent.click(screen.getByRole("button", { name: "Usar Bia Souza" }))
    expect(onSelect).toHaveBeenCalledWith(customers[0])
  })

  it("shows the chosen customer, and changing them goes back to the search", async () => {
    const onClear = vi.fn()
    render(customerSection({ selected: customers[0]!, onClear }))

    expect(screen.getByText("Bia Souza")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Trocar cliente" }))
    expect(onClear).toHaveBeenCalled()
  })
})

describe("the new order's products", () => {
  it("chooses a product, then one of its combinations, marking the one with none left", async () => {
    const onChoose = vi.fn()
    const { rerender } = render(
      <OrderProductPicker query="" onQueryChange={noop} products={products} onChoose={onChoose} chosen={null} onBack={noop} onAdd={noop} money={money} />,
    )
    await userEvent.click(screen.getByRole("button", { name: "Escolher Whey Protein" }))
    expect(onChoose).toHaveBeenCalledWith(products[0])

    const onAdd = vi.fn()
    rerender(
      <OrderProductPicker query="" onQueryChange={noop} products={products} onChoose={onChoose} chosen={{ product: products[0]!, variants }} onBack={noop} onAdd={onAdd} money={money} />,
    )
    const chocolate = screen.getByText("Sabor: Chocolate · Peso: 900 g").closest("li")!
    expect(within(chocolate).getByText("Sem estoque")).toBeInTheDocument()
    expect(within(chocolate).getByText("R$ 134,90")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Adicionar Whey Protein (Sabor: Chocolate · Peso: 900 g)" }))
    expect(onAdd).toHaveBeenCalledWith(variants[1])
  })

  it("lists each line with its total, takes a new quantity and removes a line", async () => {
    const onQuantityChange = vi.fn()
    const onRemove = vi.fn()
    render(<OrderLines lines={lines} onQuantityChange={onQuantityChange} onRemove={onRemove} money={money} />)

    expect(screen.getByText("R$ 259,80")).toBeInTheDocument()
    expect(screen.getAllByText("Sem estoque")).toHaveLength(1)

    await userEvent.type(screen.getByLabelText("Quantidade de Coqueteleira"), "3")
    expect(onQuantityChange).toHaveBeenLastCalledWith("v3", 13)

    await userEvent.click(screen.getByRole("button", { name: "Uma unidade a menos de Whey Protein (Sabor: Baunilha · Peso: 900 g)" }))
    expect(onQuantityChange).toHaveBeenLastCalledWith("v1", 1)

    await userEvent.click(screen.getByRole("button", { name: "Remover Coqueteleira" }))
    expect(onRemove).toHaveBeenCalledWith("v3")
  })
})

describe("the new order's form, as a keyboard meets it", () => {
  it("never registers the order on Enter in a search or a quantity", async () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        {customerSection()}
        <OrderProductPicker query="" onQueryChange={noop} products={products} onChoose={noop} chosen={null} onBack={noop} onAdd={noop} money={money} />
        <OrderLines lines={lines} onQuantityChange={noop} onRemove={noop} money={money} />
        <button type="submit">Registrar</button>
      </form>,
    )

    await userEvent.type(screen.getByRole("searchbox", { name: "Buscar cliente" }), "{Enter}")
    await userEvent.type(screen.getByRole("searchbox", { name: "Buscar produto" }), "Whey{Enter}")
    await userEvent.type(screen.getByLabelText("Quantidade de Coqueteleira"), "{Enter}")
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("takes a quantity typed over the old one, not appended to it", async () => {
    const onQuantityChange = vi.fn()
    render(<OrderLines lines={lines} onQuantityChange={onQuantityChange} onRemove={noop} money={money} />)

    const quantity = screen.getByLabelText("Quantidade de Whey Protein (Sabor: Baunilha · Peso: 900 g)")
    await userEvent.clear(quantity)
    await userEvent.type(quantity, "5")
    await userEvent.tab()
    expect(onQuantityChange).toHaveBeenLastCalledWith("v1", 5)
    expect(onQuantityChange).not.toHaveBeenCalledWith("v1", 25)
  })

  it("puts focus on what replaced the control that was pressed", async () => {
    const { rerender } = render(
      <OrderProductPicker query="" onQueryChange={noop} products={products} onChoose={noop} chosen={null} onBack={noop} onAdd={noop} money={money} />,
    )
    rerender(<OrderProductPicker query="" onQueryChange={noop} products={products} onChoose={noop} chosen={{ product: products[0]!, variants }} onBack={noop} onAdd={noop} money={money} />)
    expect(screen.getByRole("button", { name: "Outros produtos" })).toHaveFocus()

    rerender(<OrderProductPicker query="" onQueryChange={noop} products={products} onChoose={noop} chosen={null} onBack={noop} onAdd={noop} money={money} />)
    expect(screen.getByRole("searchbox", { name: "Buscar produto" })).toHaveFocus()
  })

  it("opens the folded address when the CEP there is what refused the customer", async () => {
    const onSubmit = vi.fn()
    render(customerSection({ search: { query: "Rita", onQueryChange: noop, results: [] }, create: { onSubmit } }))

    await userEvent.click(screen.getByRole("button", { name: "Cadastrar cliente" }))
    await userEvent.type(screen.getByLabelText("Celular"), "11988887777")
    await userEvent.click(screen.getByRole("button", { name: "Endereço (opcional)" }))
    await userEvent.type(screen.getByLabelText("CEP"), "123")
    await userEvent.click(screen.getByRole("button", { name: "Endereço (opcional)" }))
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar" }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText("O CEP tem 8 dígitos.")).toBeVisible()
  })
})

describe("the new order's details and summary", () => {
  it("asks a delivery's fee, not a pick-up's, and offers only the payments the shop accepts", async () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <OrderDetailsFields value={details} onChange={onChange} paymentMethods={["PIX", "MONEY"]} today="2026-09-25" />,
    )

    expect(screen.getByLabelText("Taxa de entrega (R$)")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Cartão de crédito" })).not.toBeInTheDocument()
    expect(screen.getByLabelText("Data do pedido")).toHaveAttribute("max", "2026-09-25")

    await userEvent.click(screen.getByRole("button", { name: "Pix" }))
    expect(onChange).toHaveBeenLastCalledWith({ ...details, paymentMethod: "PIX" })

    rerender(<OrderDetailsFields value={{ ...details, fulfillment: "PICKUP" }} onChange={onChange} paymentMethods={["PIX"]} today="2026-09-25" />)
    expect(screen.queryByLabelText("Taxa de entrega (R$)")).not.toBeInTheDocument()
  })

  it("adds the order up, and says so instead when the discount passes it", () => {
    const { rerender } = render(
      <OrderSummary totals={{ subtotalCents: 28470, deliveryFeeCents: 1000, discountCents: 500, totalCents: 28970 }} money={money} />,
    )
    expect(screen.getByText("R$ 289,70")).toBeInTheDocument()
    expect(screen.getByText("− R$ 5,00")).toBeInTheDocument()

    rerender(<OrderSummary totals="DISCOUNT_TOO_LARGE" money={money} />)
    expect(screen.getByRole("alert")).toHaveTextContent("O desconto passa do valor do pedido.")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <form>
        {customerSection()}
        <OrderLines lines={lines} onQuantityChange={noop} onRemove={noop} money={money} />
        <OrderDetailsFields value={details} onChange={noop} paymentMethods={["PIX", "MONEY"]} today="2026-09-25" />
        <OrderSummary totals={{ subtotalCents: 28470, deliveryFeeCents: 0, discountCents: 0, totalCents: 28470 }} money={money} />
      </form>,
    )
    await expectNoA11yViolations(container)
  })
})
