// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { OrderFeeCard } from "./order-fee-card"

const meta = {
  title: "Blocks/Orders/OrderFeeCard",
  component: OrderFeeCard,
  parameters: { layout: "padded" },
  args: { feeCents: null, onSave: () => {} },
} satisfies Meta<typeof OrderFeeCard>

export default meta
type Story = StoryObj<typeof meta>

/** O frete ainda a combinar: o campo vazio e a explicação de onde o valor chega. */
export const ACombinar: Story = {}

/** O frete já lançado, depois de salvar. */
export const Salvo: Story = { args: { feeCents: 1250, saved: true } }

/** A API recusou: o motivo, em palavras. */
export const Recusado: Story = { args: { feeCents: null, error: "Esse pedido foi cancelado e não muda mais." } }
