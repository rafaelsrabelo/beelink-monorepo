// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { LeadStatusSelect } from "./lead-status-select"

const meta = {
  title: "Blocos/Leads/Status",
  component: LeadStatusSelect,
  args: { value: "NEW", onChange: () => {}, label: "Status de Carlos Lima" },
} satisfies Meta<typeof LeadStatusSelect>

export default meta
type Story = StoryObj<typeof meta>

/** Onde o contato está: novo, em conversa, fechado ou perdido. */
export const Padrao: Story = {}
export const Fechado: Story = { args: { value: "WON" } }
