// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { AlignField } from "./align-field"

const meta = {
  title: "Blocos/Modo design/Alinhamento",
  component: AlignField,
  parameters: { layout: "padded" },
  args: { value: "CENTER", onChange: () => {} },
} satisfies Meta<typeof AlignField>

export default meta
type Story = StoryObj<typeof meta>

/** Esquerda, centro ou direita, em três glifos. Sempre exatamente um marcado. */
export const Padrao: Story = {}
