// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { CustomerProfileForm } from "./customer-profile-form"
import { customerRecord } from "./customers.fixtures"

const meta = {
  title: "Blocos/Clientes/Ficha/Formulário dos dados",
  component: CustomerProfileForm,
  parameters: { layout: "padded" },
  args: { customer: customerRecord, onSubmit: () => {}, onCancel: () => {} },
  // Drawn in the record's side column: the address lays itself out by the room it has there.
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CustomerProfileForm>

export default meta
type Story = StoryObj<typeof meta>

/** Nome, celular e endereço se editam; o e-mail aparece e diz por que não é um campo. */
export const Padrao: Story = {}

/** O celular de outro cliente da loja: o erro fica no campo, com o que foi digitado. */
export const CelularDeOutroCliente: Story = {
  args: { phoneError: "Esse celular já está no cadastro de outro cliente desta loja." },
}

/** Cadastrado pela loja, sem conta: não há e-mail. */
export const SemEmail: Story = { args: { customer: { ...customerRecord, email: null } } }

export const Salvando: Story = { args: { pending: true } }
