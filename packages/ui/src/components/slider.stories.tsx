// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import { Slider } from "@harness-monorepo/ui/components/slider"

const meta = {
  title: "Primitivos/Slider",
  component: Slider,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Slider>

export default meta
type Story = StoryObj<typeof meta>

/** Dois pontos numa faixa — o filtro de preço de uma listagem. */
export const FaixaDePreco: Story = {
  render: () => (
    <div className="w-64">
      <Slider defaultValue={[50, 200]} min={0} max={300} aria-label="Faixa de preço" />
    </div>
  ),
}
