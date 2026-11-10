import type { Meta, StoryObj } from "@storybook/react-vite"

import { EMPTY_PRODUCT } from "./product-form-types"
import { ProductKitFields } from "./product-kit-fields"

const meta = {
  title: "Blocos/Catálogo/Kit",
  component: ProductKitFields,
  parameters: { layout: "padded" },
  args: { value: EMPTY_PRODUCT, onChange: () => {}, categories: [{ id: "c1", name: "Dindins" }, { id: "c2", name: "Trufados", parentName: "Dindins" }, { id: "c3", name: "Bebidas" }] },
} satisfies Meta<typeof ProductKitFields>

export default meta
type Story = StoryObj<typeof meta>

/** Um produto comum: só a chave para virar kit. */
export const ProdutoComum: Story = {}

/** Um kit de 20, com qualquer produto da loja. */
export const Kit: Story = { args: { value: { ...EMPTY_PRODUCT, isKit: true, kitSize: "20" } } }

/** Todos os produtos, menos os de uma categoria: o caso da Dindin da Leia. */
export const TodosMenosUmaCategoria: Story = { args: { value: { ...EMPTY_PRODUCT, isKit: true, kitSize: "20", kitScope: "EXCEPT", kitCategoryIds: ["c3"] } } }

/** Incompleto: o painel diz o que falta em cada campo. */
export const Incompleto: Story = {
  args: { value: { ...EMPTY_PRODUCT, isKit: true, kitScope: "ONLY" }, errors: { kitSize: { message: "Informe um número de 2 a 99." }, kitCategoryIds: { message: "Marque pelo menos uma categoria." } } },
}
