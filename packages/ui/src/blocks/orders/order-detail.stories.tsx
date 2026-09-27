// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { OrderDetail } from "./order-detail"
import { order } from "./order-detail.fixtures"

const meta = {
  title: "Blocks/Orders/OrderDetail",
  component: OrderDetail,
  args: {
    order,
    backHref: "#",
    deliveryLine: "Av. Paulista, 1000 — Bela Vista — São Paulo/SP — CEP 01310-930",
    whatsappHref: "https://wa.me/5511988887777",
    customerHref: "#ficha-do-cliente",
    onStatusChange: () => {},
  },
  // The page lays itself out by the panel's main column, which the shell declares.
  decorators: [
    (Story) => (
      <div className="@container/main">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OrderDetail>

export default meta
type Story = StoryObj<typeof meta>

export const Aceito: Story = {}

export const Retirada: Story = {
  args: { order: { ...order, fulfillment: "PICKUP", deliveryAddress: null, deliveryFeeCents: 0, totalCents: 27970, status: "PREPARING" }, deliveryLine: null },
}

/** A delivery placed before orders kept where they went: it says so, never the customer's address of today. */
export const EnderecoNaoRegistrado: Story = { args: { order: { ...order, deliveryAddress: null }, deliveryLine: null } }

/** The customer changed their name since: the order still says who it went to. */
export const OutraPessoaRecebe: Story = {
  args: { order: { ...order, customer: { ...order.customer, name: "Bia Lima" }, deliveryAddress: { ...order.deliveryAddress!, recipientName: "Bia Souza" } } },
}

export const Cancelado: Story = { args: { order: { ...order, status: "CANCELLED" } } }

export const SemCelular: Story = { args: { order: { ...order, customer: { ...order.customer, phone: null } }, whatsappHref: null } }

export const NoCelular: Story = { globals: { viewport: { value: "mobile1", isRotated: false } } }
