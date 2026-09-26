// React
import { useState } from "react"

// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { CustomerDuplicates, type CustomerDuplicatesProps } from "./customer-duplicates"
import type { CustomerDuplicateView } from "./customer-types"
import { customerDuplicates } from "./customers.fixtures"

/** Asks and cancels as the record's screen does; a merge only closes the question. */
function Stateful(props: CustomerDuplicatesProps) {
  const [asking, setAsking] = useState<CustomerDuplicateView | null>(props.asking)

  return <CustomerDuplicates {...props} asking={asking} onAsk={setAsking} onCancel={() => setAsking(null)} onConfirm={() => setAsking(null)} />
}

const meta = {
  title: "Blocos/Clientes/Ficha/Possíveis duplicados",
  component: CustomerDuplicates,
  parameters: { layout: "padded" },
  args: {
    duplicates: customerDuplicates,
    hrefOf: (id: string) => `#${id}`,
    asking: null,
    onAsk: () => {},
    onConfirm: () => {},
    onCancel: () => {},
  },
  render: (args) => <Stateful {...args} />,
  decorators: [
    (Story) => (
      <div className="max-w-3xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CustomerDuplicates>

export default meta
type Story = StoryObj<typeof meta>

/** O cadastro que a loja fez com o celular que a Bia tentou salvar, e um de mesmo nome. */
export const Padrao: Story = {}

/** Este cadastro fica: o outro não tem conta. */
export const PerguntandoAqui: Story = { args: { asking: customerDuplicates[0]! } }

/** O outro tem conta: ele fica, e este é apagado. */
export const PerguntandoLa: Story = {
  args: { asking: { ...customerDuplicates[0]!, name: "Bia Souza", email: "bia@exemplo.com", hasAccount: true } },
}

export const Juntando: Story = { args: { asking: customerDuplicates[0]!, pending: true } }

export const Recusado: Story = {
  args: { asking: customerDuplicates[0]!, error: "Os dois cadastros têm conta na loja e não se juntam." },
}
