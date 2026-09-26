// React
import { useState } from "react"

// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { CustomerProfile, type CustomerProfileProps } from "./customer-profile"
import { customerRecord } from "./customers.fixtures"

/** Opens and closes the form as the record's screen does; a save lands at once. */
function Stateful(props: CustomerProfileProps) {
  const [editing, setEditing] = useState(props.editing)
  const [saved, setSaved] = useState(false)

  return (
    <CustomerProfile
      {...props}
      editing={editing}
      saved={saved}
      onEdit={() => {
        setSaved(false)
        setEditing(true)
      }}
      onCancel={() => setEditing(false)}
      onSave={() => {
        setEditing(false)
        setSaved(true)
      }}
    />
  )
}

const meta = {
  title: "Blocos/Clientes/Ficha/Dados",
  component: CustomerProfile,
  parameters: { layout: "padded" },
  args: {
    customer: { ...customerRecord, email: "caio@exemplo.com", emailVerified: true },
    addressLine: "Rua Barão de Jaguara, 1000, apto 12 — Centro — Campinas/SP — CEP 13015-904",
    editing: false,
    onEdit: () => {},
    onCancel: () => {},
    onSave: () => {},
  },
  render: (args) => <Stateful {...args} />,
  // The record's side column.
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CustomerProfile>

export default meta
type Story = StoryObj<typeof meta>

/** Nome, e-mail confirmado, celular e endereço; "Editar dados" abre o formulário no mesmo cartão. */
export const Padrao: Story = {}

/** Cadastrado pela loja: sem e-mail, sem celular e sem endereço. */
export const CadastradoPelaLoja: Story = {
  args: {
    customer: { ...customerRecord, email: null, emailVerified: false, phone: null },
    addressLine: null,
  },
}

export const EmailNaoConfirmado: Story = { args: { customer: { ...customerRecord, email: "caio@exemplo.com", emailVerified: false } } }

export const Editando: Story = { args: { editing: true } }

export const CelularDeOutroCliente: Story = {
  args: { editing: true, phoneError: "Esse celular já está no cadastro de outro cliente desta loja." },
}
