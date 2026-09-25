// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { OrderList } from "./order-list"
import { orders } from "./orders.fixtures"

const meta = {
  title: "Blocks/Orders/OrderList",
  component: OrderList,
  args: { orders, hrefOf: (number: number) => `#${number}`, newHref: "#" },
} satisfies Meta<typeof OrderList>

export default meta
type Story = StoryObj<typeof meta>

export const ComPedidos: Story = {}

export const NoCelular: Story = { parameters: { viewport: { defaultViewport: "mobile1" } } }

export const Vazio: Story = { args: { orders: [] } }

export const SemResultado: Story = { args: { orders: [], filtered: true } }
