import type { Meta, StoryObj } from "@storybook/react-vite"

import { ChartAreaInteractive } from "./chart-area-interactive"
import { sampleChartData } from "./dashboard.fixtures"

const meta = {
  title: "Blocos/Painel/Gráfico",
  component: ChartAreaInteractive,
  parameters: { layout: "padded" },
  args: { data: sampleChartData },
} satisfies Meta<typeof ChartAreaInteractive>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

export const SemDados: Story = {
  args: { data: [], description: "Ainda não há dados para este período" },
}
