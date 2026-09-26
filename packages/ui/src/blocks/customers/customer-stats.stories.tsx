// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { CustomerStats } from "./customer-stats"
import { customerRecord } from "./customers.fixtures"

const meta = {
  title: "Blocos/Clientes/Ficha/Números",
  component: CustomerStats,
  parameters: { layout: "padded" },
  args: { customer: customerRecord },
  // Two, three or six to a row, by the panel's main column, which the shell declares.
  decorators: [
    (Story) => (
      <div className="@container/main">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CustomerStats>

export default meta
type Story = StoryObj<typeof meta>

/** Pedidos, total gasto, ticket médio, primeiro e último pedido e dias sem comprar — só os válidos. */
export const Padrao: Story = {}

/** Um lead: nenhum pedido, e um traço onde não há o que mostrar — nunca um zero que parece número. */
export const Lead: Story = {
  args: {
    customer: { ordersCount: 0, totalSpentCents: 0, averageTicketCents: null, firstOrderAt: null, lastOrderAt: null, daysSinceLastOrder: null },
  },
}

export const NoCelular: Story = { globals: { viewport: { value: "mobile1", isRotated: false } } }
