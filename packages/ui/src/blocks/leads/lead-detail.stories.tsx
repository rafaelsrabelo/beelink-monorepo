// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { LeadDetail } from "./lead-detail"
import { sampleLeads } from "./leads.fixtures"

const meta = {
  title: "Blocos/Leads/Detalhe",
  component: LeadDetail,
  args: { lead: sampleLeads[0]!, onStatusChange: () => {}, onDelete: () => {} },
} satisfies Meta<typeof LeadDetail>

export default meta
type Story = StoryObj<typeof meta>

/** Como responder, o que escreveu e onde está. */
export const Padrao: Story = {}

/** Só nome e telefone: o formulário não perguntou mais nada. */
export const SemRespostas: Story = { args: { lead: sampleLeads[1]! } }
