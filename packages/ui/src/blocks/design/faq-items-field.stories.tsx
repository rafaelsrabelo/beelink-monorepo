// Libs
import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { FaqItemsField, type FaqValue } from "./faq-items-field"

let next = 0

const meta = {
  title: "Blocos/Modo design/Perguntas frequentes",
  component: FaqItemsField,
  parameters: { layout: "padded" },
  args: {
    value: [
      { id: "a", question: "Quanto tempo leva a entrega?", answer: "De 2 a 5 dias úteis." },
      { id: "b", question: "Posso trocar?", answer: "Sim, em até 7 dias." },
    ],
    onChange: () => {},
    newItemId: () => `nova-${(next += 1)}`,
  },
  render: function Render(args) {
    const [value, setValue] = useState<FaqValue[]>([...args.value])
    return <FaqItemsField {...args} value={value} onChange={setValue} />
  },
} satisfies Meta<typeof FaqItemsField>

export default meta
type Story = StoryObj<typeof meta>

/** Suba, desça, tire e acrescente; o botão apertado fica com o foco enquanto a pergunta anda. */
export const Padrao: Story = {}

/** Uma pergunta sem resposta: o Salvar espera, e o campo diz por quê. */
export const SemResposta: Story = { args: { value: [{ id: "a", question: "Tem retirada na loja?", answer: "" }] } }

export const Vazia: Story = { args: { value: [] } }
