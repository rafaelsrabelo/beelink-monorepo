import type { Meta, StoryObj } from "@storybook/react-vite"

import { ProductCashbackCell } from "./product-cashback-cell"

const meta = {
  title: "Blocos/Catálogo/Cashback do produto na lista",
  component: ProductCashbackCell,
  args: { name: "Whey Concentrado", rateBps: 500, onAdd: () => {} },
} satisfies Meta<typeof ProductCashbackCell>

export default meta
type Story = StoryObj<typeof meta>

/** O percentual que o produto devolve. */
export const ComPercentual: Story = {}

/** Sem percentual, o produto não gera cashback: a lista oferece adicionar. */
export const SemPercentual: Story = { args: { rateBps: null } }
