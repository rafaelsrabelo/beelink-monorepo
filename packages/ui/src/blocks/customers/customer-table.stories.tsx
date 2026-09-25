// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { CustomerTable, type CustomerTableItem } from "./customer-table"

const customers: CustomerTableItem[] = [
  { id: "1", name: "Bia Souza", email: "bia@exemplo.com", emailVerified: true, phone: "5511977776666", city: "São Paulo", state: "SP", stage: "LEAD", createdAt: "2026-09-25T10:00:00.000Z" },
  { id: "2", name: "Caio Lima", email: "caio@exemplo.com", emailVerified: false, phone: null, city: null, state: null, stage: "LEAD", createdAt: "2026-09-24T18:30:00.000Z" },
]

const meta = {
  title: "Blocos/Painel/Clientes",
  component: CustomerTable,
  parameters: { layout: "padded" },
  args: { customers },
} satisfies Meta<typeof CustomerTable>

export default meta
type Story = StoryObj<typeof meta>

/** Quem criou conta na loja: contato, cidade, estágio (lead até comprar) e quando a conta foi criada. */
export const Padrao: Story = {}

export const Vazio: Story = { args: { customers: [] } }

export const BuscaSemResultado: Story = { args: { customers: [], searching: true } }
