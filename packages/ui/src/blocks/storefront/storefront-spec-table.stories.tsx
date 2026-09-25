// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { StorefrontSpecTable } from "./storefront-spec-table"

const meta = {
  title: "Blocos/Vitrine/Produto · tabela técnica",
  component: StorefrontSpecTable,
  parameters: { layout: "padded" },
  args: {
    rows: [
      { label: "Categoria", value: "Pré-treino" },
      { label: "Sabor", value: "Frutas vermelhas, Limão, Uva, Maçã verde" },
    ],
  },
} satisfies Meta<typeof StorefrontSpecTable>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}
