// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import { AspectRatio } from "@harness-monorepo/ui/components/aspect-ratio"

const meta = {
  title: "Primitivos/AspectRatio",
  component: AspectRatio,
  parameters: { layout: "centered" },
} satisfies Meta<typeof AspectRatio>

export default meta
type Story = StoryObj<typeof meta>

/** Uma área que guarda a proporção antes de a foto chegar, para a página não pular. */
export const Quadrado: Story = {
  args: { ratio: 1, className: "bg-muted rounded-lg" },
  render: (args) => (
    <div className="w-60">
      <AspectRatio {...args} />
    </div>
  ),
}
