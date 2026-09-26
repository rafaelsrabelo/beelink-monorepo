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
    addressLine: "Av. Paulista, 1000 — Bela Vista, São Paulo/SP — 01310-930",
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

export const Retirada: Story = { args: { order: { ...order, fulfillment: "PICKUP", deliveryFeeCents: 0, totalCents: 27970, status: "PREPARING" } } }

export const Cancelado: Story = { args: { order: { ...order, status: "CANCELLED" } } }

export const SemCelular: Story = { args: { order: { ...order, customer: { ...order.customer, phone: null } }, whatsappHref: null, addressLine: null } }

export const NoCelular: Story = { globals: { viewport: { value: "mobile1", isRotated: false } } }
