// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { CustomerList } from "./customer-list"
import { customers } from "./customers.fixtures"

const meta = {
  title: "Blocos/Clientes/Lista",
  component: CustomerList,
  parameters: { layout: "padded" },
  args: {
    customers,
    hrefOf: (id: string) => `#${id}`,
    whatsappHrefOf: (customer) => (customer.phone ? `https://wa.me/${customer.phone}` : null),
  },
  // The list picks table or cards by the panel's main column, which the shell declares.
  decorators: [
    (Story) => (
      <div className="@container/main">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CustomerList>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Quem nunca comprou, quem compra e quem sumiu: o estágio (o Inativo diz há quantos dias), os
 * pedidos, o total gasto, o último pedido, a cidade e o WhatsApp — desligado, e dizendo por quê,
 * para quem não tem celular.
 */
export const Padrao: Story = {}

export const NoCelular: Story = { globals: { viewport: { value: "mobile1", isRotated: false } } }

export const Vazio: Story = { args: { customers: [] } }

export const BuscaSemResultado: Story = { args: { customers: [], searching: true } }

export const EstagioVazio: Story = { args: { customers: [], stage: "INACTIVE" } }
