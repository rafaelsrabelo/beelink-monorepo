// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { DesignColors } from "./design-colors"
import palettes from "../store/store-palettes.json"

const meta = {
  title: "Blocos/Modo design/Cores",
  component: DesignColors,
  parameters: { layout: "padded" },
  args: {
    // From the sample palettes rather than written here: a shop colour in a .tsx is what
    // `web/no-hex-colors` exists to stop, and that file states the precedent in its own comment.
    value: palettes.presets[0]!.colors,
    onChange: () => {},
    presets: palettes.presets,
    dirty: false,
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DesignColors>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Três superfícies e a marca — e **nenhuma tinta entre elas**. Toda palavra da vitrine é derivada
 * do que ela está por cima, então um seletor para o texto seria um controle capaz de escrever
 * preto no preto. Esse era um estado que o lojista conseguia alcançar.
 */
export const Padrao: Story = {}

/** Com algo mudado: só aí o salvar acorda. */
export const ComAlteracao: Story = { args: { dirty: true, onSave: () => {} } }
