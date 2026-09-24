// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@harness-monorepo/ui/components/input-group"

const meta = {
  title: "Primitivos/InputGroup",
  component: InputGroup,
  parameters: { layout: "centered" },
} satisfies Meta<typeof InputGroup>

export default meta
type Story = StoryObj<typeof meta>

/** Um campo com um texto colado à frente — o preço de uma variação, por exemplo. */
export const Preco: Story = {
  render: () => (
    <InputGroup className="w-48">
      <InputGroupAddon>
        <InputGroupText>R$</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput aria-label="Preço" inputMode="decimal" placeholder="0,00" />
    </InputGroup>
  ),
}
