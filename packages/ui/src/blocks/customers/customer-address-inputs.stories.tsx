// React
import { useState } from "react"

// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"

// Block
import { CustomerAddressInputs, type CustomerAddressInputsProps } from "./customer-address-inputs"
import { customerRecord } from "./customers.fixtures"

const filled = {
  zipCode: "13015-904",
  street: "Rua Barão de Jaguara",
  number: "1000",
  complement: "apto 12",
  neighborhood: "Centro",
  city: "Campinas",
  state: customerRecord.address.state ?? "",
}

function Typing(props: CustomerAddressInputsProps) {
  const [value, setValue] = useState(props.value)
  return <CustomerAddressInputs {...props} value={value} onChange={setValue} />
}

const meta = {
  title: "Blocos/Clientes/Endereço do cliente",
  component: CustomerAddressInputs,
  parameters: { layout: "padded" },
  args: { idPrefix: "historia", value: filled, onChange: () => {}, messages: defaultMessages },
  render: (args) => <Typing {...args} />,
} satisfies Meta<typeof CustomerAddressInputs>

export default meta
type Story = StoryObj<typeof meta>

/** Três linhas onde há espaço: CEP e rua; número, complemento e bairro; cidade e UF. */
export const Largo: Story = {}

/** Numa coluna estreita — a lateral da ficha — um campo por linha. */
export const Estreito: Story = {
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
}

export const ComErros: Story = {
  args: {
    value: { ...filled, zipCode: "130", state: "São" },
    issues: { zipCode: defaultMessages.orders.form.zipCodeInvalid, state: defaultMessages.orders.form.stateInvalid },
  },
}
