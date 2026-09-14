import type { Meta, StoryObj } from "@storybook/react-vite"

import { SectionCards } from "./section-cards"
import { sampleCards } from "./dashboard.fixtures"

const meta = {
  title: "Blocos/Painel/Cartões",
  component: SectionCards,
  parameters: { layout: "padded" },
  args: { cards: sampleCards },
} satisfies Meta<typeof SectionCards>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** A falling number turns the arrow around; the block reads it off the trend's sign. */
export const EmQueda: Story = {
  args: { cards: [{ label: "Novas contas", value: "312", trend: "-8,2%", footnote: "Abaixo do mês anterior" }] },
}

export const SemTendencia: Story = {
  args: { cards: [{ label: "Contas criadas hoje", value: "27" }] },
}
