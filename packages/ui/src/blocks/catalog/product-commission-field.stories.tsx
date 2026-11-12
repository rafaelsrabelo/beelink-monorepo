import type { Meta, StoryObj } from "@storybook/react-vite"

import { ProductCommissionField } from "./product-commission-field"
import { EMPTY_PRODUCT } from "./product-form-types"

const meta = {
  title: "Blocos/Catálogo/Comissão de afiliado no produto",
  component: ProductCommissionField,
  args: { value: { ...EMPTY_PRODUCT, commission: "15" }, onChange: () => {}, defaultRate: "10%" },
} satisfies Meta<typeof ProductCommissionField>

export default meta
type Story = StoryObj<typeof meta>

/** Um percentual próprio na tabela Padrão. */
export const ComPercentual: Story = {}

/** Vazio, o produto segue a tabela Padrão. */
export const SegueAPadrao: Story = { args: { value: EMPTY_PRODUCT } }

/** Um percentual que não vale. */
export const Recusado: Story = { args: { value: { ...EMPTY_PRODUCT, commission: "120" }, errors: { commission: { message: "Informe um percentual de 0% a 100%, ou deixe vazio." } } } }
