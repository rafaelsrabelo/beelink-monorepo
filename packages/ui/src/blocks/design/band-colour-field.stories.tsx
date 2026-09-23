// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { sampleColorPresets as presets } from "../store/store.fixtures"
import { BandColourField } from "./band-colour-field"

const meta = {
  title: "Blocos/Modo design/Cor da faixa",
  component: BandColourField,
  parameters: { layout: "padded" },
  args: {
    id: "band",
    value: "",
    onChange: () => {},
    pageBackground: presets[0]!.colors.background,
    label: "Cor de fundo da faixa",
    noneLabel: "A cor da página",
  },
  decorators: [
    (Story) => (
      <div className="flex max-w-md flex-col gap-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BandColourField>

export default meta
type Story = StoryObj<typeof meta>

/** Desligado: a cor da página, dita em palavras. Ligar começa da cor da página. */
export const Padrao: Story = {}

/** Ligado: o seletor e o hexadecimal, escrevendo o mesmo valor. */
export const Ligado: Story = { args: { value: presets[2]!.colors.header } }
