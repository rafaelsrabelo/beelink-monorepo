import type { Meta, StoryObj } from "@storybook/react-vite"

import { ProductCashbackField } from "./product-cashback-field"
import { EMPTY_PRODUCT } from "./product-form-types"

const meta = {
  title: "Blocos/Catálogo/Cashback do produto",
  component: ProductCashbackField,
  parameters: { layout: "padded" },
  args: { value: { ...EMPTY_PRODUCT, cashback: "5" }, onChange: () => {} },
} satisfies Meta<typeof ProductCashbackField>

export default meta
type Story = StoryObj<typeof meta>

/** O percentual que este produto devolve, numa loja que dá o cashback por produto. */
export const Preenchido: Story = {}

/** Vazio, o produto não gera cashback. */
export const Vazio: Story = { args: { value: EMPTY_PRODUCT } }

/** Um percentual que não vale, dito no campo. */
export const Recusado: Story = {
  args: { value: { ...EMPTY_PRODUCT, cashback: "150" }, errors: { cashback: { message: "Informe um percentual entre 0,01% e 100%, ou deixe vazio." } } },
}
