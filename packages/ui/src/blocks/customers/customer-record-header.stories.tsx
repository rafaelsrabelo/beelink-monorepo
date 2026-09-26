// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { CustomerRecordHeader } from "./customer-record-header"
import { customerRecord, customers } from "./customers.fixtures"

const meta = {
  title: "Blocos/Clientes/Ficha/Cabeçalho",
  component: CustomerRecordHeader,
  parameters: { layout: "padded" },
  args: {
    customer: customerRecord,
    backHref: "#",
    newOrderHref: "#novo-pedido",
    whatsappHref: "https://wa.me/5511955554444",
  },
} satisfies Meta<typeof CustomerRecordHeader>

export default meta
type Story = StoryObj<typeof meta>

/** O nome, o estágio, desde quando está na loja, e o que o lojista faz em seguida. */
export const Padrao: Story = {}

/** Quem parou de comprar diz há quantos dias; sem celular, o WhatsApp fica desligado e diz por quê. */
export const InativoSemCelular: Story = {
  args: { customer: { ...customerRecord, ...customers[2]!, createdAt: customerRecord.createdAt }, whatsappHref: null },
}

export const NoCelular: Story = { globals: { viewport: { value: "mobile1", isRotated: false } } }
