// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { LeadTable } from "./lead-table"
import { sampleLeads } from "./leads.fixtures"

const meta = {
  title: "Blocos/Leads/Tabela",
  component: LeadTable,
  args: { leads: sampleLeads, onOpen: () => {}, onStatusChange: () => {} },
} satisfies Meta<typeof LeadTable>

export default meta
type Story = StoryObj<typeof meta>

/** Quem escreveu, do mais recente ao mais antigo. Os novos em destaque. */
export const Padrao: Story = {}
export const Vazia: Story = { args: { leads: [] } }
export const VaziaComFiltro: Story = { args: { leads: [], filtered: true } }
