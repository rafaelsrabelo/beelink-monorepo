// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { OrderList } from "./order-list"
import { onlineOrders, orders } from "./orders.fixtures"

const meta = {
  title: "Blocks/Orders/OrderList",
  component: OrderList,
  args: { orders, hrefOf: (number: number) => `#${number}`, newHref: "#" },
  // The list picks table or cards by the panel's main column, which the shell declares.
  decorators: [
    (Story) => (
      <div className="@container/main">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OrderList>

export default meta
type Story = StoryObj<typeof meta>

export const ComPedidos: Story = {}

/** Pedidos cobrados online: pago, aguardando, sem cobrança ainda, com pagamento a resolver e estornado; o último é combinado com a loja e não diz nada. */
export const ComPagamentoOnline: Story = { args: { orders: onlineOrders } }

export const ComPagamentoOnlineNoCelular: Story = { args: { orders: onlineOrders }, globals: { viewport: { value: "mobile1", isRotated: false } } }

export const NoCelular: Story = { globals: { viewport: { value: "mobile1", isRotated: false } } }

export const Vazio: Story = { args: { orders: [] } }

export const SemResultado: Story = { args: { orders: [], filtered: true } }
