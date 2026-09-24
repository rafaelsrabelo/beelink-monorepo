// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import { Label } from "@harness-monorepo/ui/components/label"
import { Switch } from "@harness-monorepo/ui/components/switch"

const meta = {
  title: "Primitivos/Switch",
  component: Switch,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Switch>

export default meta
type Story = StoryObj<typeof meta>

/** Liga e desliga uma coisa só — "vendo esta combinação", por exemplo. */
export const Padrao: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Switch id="vendo" defaultChecked />
      <Label htmlFor="vendo">Vendo esta combinação</Label>
    </div>
  ),
}
