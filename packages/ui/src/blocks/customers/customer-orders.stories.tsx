// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { TablePager } from "../catalog/table-pager"
import { CustomerOrders } from "./customer-orders"
import { customerOrders } from "./customers.fixtures"

const meta = {
  title: "Blocos/Clientes/Ficha/Histórico de pedidos",
  component: CustomerOrders,
  parameters: { layout: "padded" },
  args: { orders: customerOrders, hrefOf: (number: number) => `#${number}` },
} satisfies Meta<typeof CustomerOrders>

export default meta
type Story = StoryObj<typeof meta>

/** Do mais recente ao mais antigo, com o cancelado — cada um leva ao seu pedido. */
export const Padrao: Story = {}

export const ComPaginas: Story = {
  args: { pager: <TablePager page={1} pageSize={4} total={9} onPageChange={() => {}} /> },
}

export const Carregando: Story = { args: { orders: [], loading: true } }

export const SemPedidos: Story = { args: { orders: [] } }

export const NoCelular: Story = { globals: { viewport: { value: "mobile1", isRotated: false } } }
