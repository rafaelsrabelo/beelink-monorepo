// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { ShowcaseSourceField } from "./showcase-source-field"

const meta = {
  title: "Blocos/Modo design/Fonte da vitrine",
  component: ShowcaseSourceField,
  parameters: { layout: "padded" },
  args: { value: "ALL", onChange: () => {} },
} satisfies Meta<typeof ShowcaseSourceField>

export default meta
type Story = StoryObj<typeof meta>

export const Todos: Story = {}

/** A frase embaixo diz o que a promoção exige: um preço "de" maior que o preço. */
export const Promocao: Story = { args: { value: "ON_SALE" } }
