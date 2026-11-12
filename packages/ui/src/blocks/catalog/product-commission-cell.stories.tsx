import type { Meta, StoryObj } from "@storybook/react-vite"

import { ProductCommissionCell } from "./product-commission-cell"

const meta = {
  title: "Blocos/Catálogo/Comissão de afiliado na lista",
  component: ProductCommissionCell,
  args: { name: "Whey Concentrado", rateBps: 2500, defaultRateBps: 1000, onEdit: () => {} },
} satisfies Meta<typeof ProductCommissionCell>

export default meta
type Story = StoryObj<typeof meta>

/** O percentual próprio do produto na tabela Padrão. */
export const ComPercentualProprio: Story = {}

/** Sem percentual próprio, o produto paga o da tabela Padrão. */
export const SegueAPadrao: Story = { args: { rateBps: null } }
