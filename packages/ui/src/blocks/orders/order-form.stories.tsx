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
        <OrderDetailsFields value={details} onChange={setDetails} paymentMethods={["PIX", "MONEY", "CREDIT_CARD"]} today="2026-09-25" />
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

export const DescontoAlto: Story = {
  render: () => <OrderSummary totals="DISCOUNT_TOO_LARGE" money={money} />,
}
