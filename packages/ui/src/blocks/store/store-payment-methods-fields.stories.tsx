import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { en } from "../../locales/en"
import { StorePaymentMethodsFields } from "./store-payment-methods-fields"
import { sampleStoreSettingsValues } from "./store.fixtures"

const meta = {
  title: "Blocos/Loja/Aba pagamento",
  component: StorePaymentMethodsFields,
  parameters: { layout: "padded" },
  args: {
    value: sampleStoreSettingsValues.paymentMethods,
    onChange: fn(),
  },
} satisfies Meta<typeof StorePaymentMethodsFields>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

export const TodasAsFormas: Story = {
  args: { value: ["MONEY", "PIX", "CREDIT_CARD", "DEBIT_CARD"] },
}

/** None ticked is refused, not merely warned about: the checkout would have nothing to offer. */
export const NenhumaForma: Story = {
  args: {
    value: [],
    error: { message: "Escolha ao menos uma forma de pagamento" },
  },
}

export const EmIngles: Story = {
  args: { messages: en },
}
