// React
import { useState } from "react"

// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { OrderCustomerSection } from "./order-customer-section"
import { OrderDetailsFields } from "./order-details-fields"
import { customers, lines as sampleLines, money, products, variants } from "./order-form.fixtures"
import { orderTotalsOf, type OrderCustomerOption, type OrderDetailsValues, type OrderFormLine, type OrderProductOption } from "@harness-monorepo/ui/lib/order-form"
import { OrderLines } from "./order-lines"
import { OrderProductPicker } from "./order-product-picker"
import { OrderSummary } from "./order-summary"

/** The new order's blocks, wired together the way the panel's screen wires them. */
function NewOrder({ initialLines }: { initialLines: OrderFormLine[] }) {
  const [selected, setSelected] = useState<OrderCustomerOption | null>(null)
  const [query, setQuery] = useState("")
  const [chosen, setChosen] = useState<OrderProductOption | null>(null)
  const [lines, setLines] = useState(initialLines)
  const [details, setDetails] = useState<OrderDetailsValues>({
    fulfillment: "DELIVERY",
    deliveryFee: "10,00",
    paymentMethod: "PIX",
    discount: "",
    note: "",
    placedOn: "2026-09-25",
  })
  const totals = orderTotalsOf(lines, details.fulfillment, details.fulfillment === "DELIVERY" ? 1000 : 0, 0)
  // A customer from the search has an address; one registered here, with none typed, has nowhere.
  const deliveryTo = selected ? { loading: false as const, line: selected.id === "new" ? null : "Av. Paulista, 1000 — Bela Vista — São Paulo/SP" } : undefined

  return (
    <form className="@container/main grid max-w-5xl gap-6 lg:grid-cols-[1fr_20rem]" onSubmit={(event) => event.preventDefault()}>
      <div className="flex flex-col gap-6">
        <OrderCustomerSection
          selected={selected}
          onSelect={setSelected}
          onClear={() => setSelected(null)}
          search={{ query, onQueryChange: setQuery, results: customers.filter((customer) => customer.name.toLowerCase().includes(query.toLowerCase())) }}
          create={{ onSubmit: (draft) => setSelected({ id: "new", name: draft.name, phone: draft.phone, email: null }) }}
        />
        <OrderProductPicker
          query=""
          onQueryChange={() => {}}
          products={products}
          onChoose={setChosen}
          chosen={chosen ? { product: chosen, variants } : null}
          onBack={() => setChosen(null)}
          onAdd={(variant) =>
            setLines([
              ...lines,
              { variantId: variant.id, productName: chosen?.name ?? "", variantLabel: variant.label, unitPriceCents: variant.priceCents, quantity: 1, available: variant.available },
            ])
          }
          money={money}
        />
        <OrderLines
          lines={lines}
          onQuantityChange={(id, quantity) => setLines(lines.map((line) => (line.variantId === id ? { ...line, quantity } : line)))}
          onRemove={(id) => setLines(lines.filter((line) => line.variantId !== id))}
          money={money}
        />
        <OrderDetailsFields
          value={details}
          onChange={setDetails}
          paymentMethods={["PIX", "MONEY", "CREDIT_CARD"]}
          today="2026-09-25"
          deliveryTo={deliveryTo}
        />
      </div>
      <div>
        <OrderSummary totals={totals} money={money} />
      </div>
    </form>
  )
}

const meta = {
  title: "Blocks/Orders/NewOrder",
  component: NewOrder,
  args: { initialLines: sampleLines },
} satisfies Meta<typeof NewOrder>

export default meta
type Story = StoryObj<typeof meta>

export const ComItens: Story = {}

export const Vazio: Story = { args: { initialLines: [] } }

export const NoCelular: Story = { globals: { viewport: { value: "mobile1", isRotated: false } } }

/** The chosen customer's record has no street and city: the form says so before the API refuses. */
export const EntregaSemEndereco: Story = {
  render: () => (
    <OrderDetailsFields
      value={{ fulfillment: "DELIVERY", deliveryFee: "", paymentMethod: "PIX", discount: "", note: "", placedOn: "2026-09-25" }}
      onChange={() => {}}
      paymentMethods={["PIX", "MONEY"]}
      today="2026-09-25"
      deliveryTo={{ loading: false, line: null }}
    />
  ),
}

export const DescontoAlto: Story = {
  render: () => <OrderSummary totals="DISCOUNT_TOO_LARGE" money={money} />,
}

/** BEELINK-244: o cliente escolhido tem cashback, e o pedido aceita só parte dele. */
export const ComCashbackDoCliente: Story = {
  render: () => (
    <OrderSummary
      totals={{ subtotalCents: 28470, deliveryFeeCents: 1000, discountCents: 0, totalCents: 24470, priced: [], cashbackUsedCents: 5000 }}
      cashback={{ balanceCents: 8000, cappedCents: 5000, checked: true, onCheckedChange: () => {} }}
      money={money}
    />
  ),
}
