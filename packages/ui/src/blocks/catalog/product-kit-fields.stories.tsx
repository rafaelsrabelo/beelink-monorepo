import type { Meta, StoryObj } from "@storybook/react-vite"

import { EMPTY_PRODUCT } from "./product-form-types"
import { ProductKitFields } from "./product-kit-fields"

const meta = {
  title: "Blocos/Catálogo/Kit",
  component: ProductKitFields,
  parameters: { layout: "padded" },
  args: { value: EMPTY_PRODUCT, onChange: () => {}, categories: [{ id: "c1", name: "Dindins" }, { id: "c2", name: "Trufados", parentName: "Dindins" }] },
} satisfies Meta<typeof ProductKitFields>

export default meta
type Story = StoryObj<typeof meta>

/** Um produto comum: só a chave para virar kit. */
export const ProdutoComum: Story = {}

/** Um kit de 20 dindins, montado pelo cliente com os itens da categoria Dindins. */
export const Kit: Story = { args: { value: { ...EMPTY_PRODUCT, isKit: true, kitSize: "20", kitCategoryId: "c1" } } }

/** Incompleto: o painel diz o que falta em cada campo. */
export const Incompleto: Story = {
  args: { value: { ...EMPTY_PRODUCT, isKit: true }, errors: { kitSize: { message: "Informe um número de 2 a 99." }, kitCategoryId: { message: "Escolha a categoria de onde vêm os itens do kit." } } },
}
