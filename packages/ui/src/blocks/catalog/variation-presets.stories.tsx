// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { VariationPresets } from "./variation-presets"

const meta = {
  title: "Blocos/Catálogo/Variações/Atalhos de opção",
  component: VariationPresets,
  parameters: { layout: "padded" },
  args: { taken: [], full: false, onAdd: () => {} },
} satisfies Meta<typeof VariationPresets>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** Tamanho e Cor já usados: os dois atalhos ficam desligados. */
export const ComOpcoes: Story = { args: { taken: ["Tamanho", "Cor"] } }

/** Três opções: tudo desligado, e a frase do limite. */
export const NoLimite: Story = { args: { taken: ["Tamanho", "Cor", "Peso"], full: true } }
