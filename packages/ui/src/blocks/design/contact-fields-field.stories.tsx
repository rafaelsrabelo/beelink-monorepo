// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"

// Block
import { ContactFieldsField, type ContactFieldValue } from "./contact-fields-field"

const fields: ContactFieldValue[] = [
  { id: "email", label: "E-mail", type: "EMAIL", required: true, options: "" },
  { id: "telefone", label: "Telefone", type: "PHONE", required: true, options: "" },
  { id: "volume", label: "Volume por semana", type: "SELECT", required: false, options: "Até 10t\nDe 10 a 50t\nMais de 50t" },
]

function Stateful({ initial }: { initial: ContactFieldValue[] }) {
  const [value, setValue] = useState(initial)
  let next = 0

  return <ContactFieldsField value={value} onChange={setValue} newFieldId={() => `novo-${(next += 1)}`} />
}

const meta = {
  title: "Blocos/Design/Campos do formulário de contato",
  component: ContactFieldsField,
  args: { value: fields, onChange: () => {}, newFieldId: () => "novo" },
} satisfies Meta<typeof ContactFieldsField>

export default meta
type Story = StoryObj<typeof meta>

/** O que o dono pergunta a quem escreve. O nome não está aqui: é sempre pedido, primeiro. */
export const Padrao: Story = { render: () => <Stateful initial={fields} /> }

/** Sem e-mail nem telefone obrigatório não há como responder — o aviso diz isso antes de salvar. */
export const SemComoResponder: Story = {
  render: () => <Stateful initial={[{ id: "msg", label: "Mensagem", type: "TEXTAREA", required: true, options: "" }]} />,
}
