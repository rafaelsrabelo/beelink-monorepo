import type { Meta, StoryObj } from "@storybook/react-vite"

import { ProductNameCell } from "./product-name-cell"

const meta = {
  title: "Blocos/Catálogo/Nome do produto",
  component: ProductNameCell,
  args: { name: "Camiseta oversized", imageUrl: null },
} satisfies Meta<typeof ProductNameCell>

export default meta
type Story = StoryObj<typeof meta>

/** O nome e a foto, como na lista de produtos. */
export const Padrao: Story = {}

/** Com o Melhor Envio conectado, o produto sem peso não é cotado por transportadora. */
export const SemPeso: Story = { args: { carrierGap: "NO_WEIGHT" } }

/** Sem medidas e sem embalagem padrão na loja. */
export const SemMedidas: Story = { args: { carrierGap: "NO_SIZE" } }
