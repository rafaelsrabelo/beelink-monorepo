// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@harness-monorepo/ui/components/popover"

const meta = {
  title: "Primitivos/Popover",
  component: PopoverContent,
  parameters: { layout: "centered" },
} satisfies Meta<typeof PopoverContent>

export default meta
type Story = StoryObj<typeof meta>

/** Um painel pequeno preso a um botão — onde se escolhe a cor de um valor de variação. */
export const Padrao: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" />}>Escolher a cor</PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Cor</PopoverTitle>
          <PopoverDescription>A bolinha que o cliente vê na vitrine.</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  ),
}
