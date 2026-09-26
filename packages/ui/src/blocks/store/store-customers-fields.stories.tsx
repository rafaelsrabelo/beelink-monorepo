import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { en } from "../../locales/en"
import { StoreCustomersFields } from "./store-customers-fields"

const meta = {
  title: "Blocos/Loja/Aba clientes",
  component: StoreCustomersFields,
  parameters: { layout: "padded" },
  args: { value: { inactiveAfterDays: 60 }, onChange: fn() },
} satisfies Meta<typeof StoreCustomersFields>

export default meta
type Story = StoryObj<typeof meta>

/** Depois de quantos dias sem pedido um cliente aparece como Inativo. O padrão é 60. */
export const Padrao: Story = {}

/** Fora de 7 a 365 dias, o campo diz o limite em vez de guardar o número. */
export const ComErro: Story = {
  args: { value: { inactiveAfterDays: 3 }, error: { message: "Um número de 7 a 365 dias" } },
}

export const Desativado: Story = { args: { disabled: true } }

export const EmIngles: Story = { args: { messages: en } }
