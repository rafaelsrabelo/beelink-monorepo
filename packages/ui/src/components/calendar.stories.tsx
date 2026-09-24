// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import { Calendar } from "@harness-monorepo/ui/components/calendar"

const meta = {
  title: "Primitivos/Calendar",
  component: Calendar,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Calendar>

export default meta
type Story = StoryObj<typeof meta>

/** Um mês para escolher um dia. */
export const Padrao: Story = {
  args: { mode: "single", defaultMonth: new Date(2026, 8, 1) },
}
