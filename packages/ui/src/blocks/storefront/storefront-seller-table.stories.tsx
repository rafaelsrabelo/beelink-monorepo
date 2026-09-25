// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { StorefrontSellerTable } from "./storefront-seller-table"

const meta = {
  title: "Blocos/Vitrine/Quem vende",
  component: StorefrontSellerTable,
  parameters: { layout: "padded" },
  args: { sellerName: "Mutante Suplementos", paymentMethods: ["PIX", "CREDIT_CARD", "DEBIT_CARD", "MONEY"] },
} satisfies Meta<typeof StorefrontSellerTable>

export default meta
type Story = StoryObj<typeof meta>

/** "Vendido por" e "Pagamento", com crédito e débito juntos em "Cartão". */
export const Padrao: Story = {}

/** Sem formas de pagamento cadastradas, a linha some. */
export const SemPagamento: Story = { args: { paymentMethods: [] } }
