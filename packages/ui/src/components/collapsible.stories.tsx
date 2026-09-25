// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@harness-monorepo/ui/components/collapsible"

const meta = {
  title: "Primitivos/Collapsible",
  component: Collapsible,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Collapsible>

export default meta
type Story = StoryObj<typeof meta>

/** Um grupo de filtros que abre e fecha. */
export const Padrao: Story = {
  render: () => (
    <Collapsible className="flex w-64 flex-col gap-2">
      <CollapsibleTrigger className="text-left text-sm font-medium underline">Faixa de preço</CollapsibleTrigger>
      <CollapsibleContent className="text-muted-foreground text-sm">De R$ 50 a R$ 200</CollapsibleContent>
    </Collapsible>
  ),
}
