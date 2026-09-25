// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { sampleColorPresets as presets } from "../store/store.fixtures"
import { BandStyleFields } from "./band-style-fields"

const meta = {
  title: "Blocos/Modo design/Estilo da faixa",
  component: BandStyleFields,
  parameters: { layout: "padded" },
  args: {
    value: { name: "", width: "CONTAINED", background: "" },
    onChange: () => {},
    pageBackground: presets[0]!.colors.background,
  },
  decorators: [
    (Story) => (
      <div className="flex w-85 flex-col gap-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BandStyleFields>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Nome, largura e cor. Não há cor de texto, e a ausência é a promessa — o que está escrito na faixa
 * deriva da cor dela, e o dono não consegue escolher duas que façam as próprias palavras sumirem.
 */
export const Padrao: Story = {}

/** Com cor própria e ponta a ponta, escolhida por um dos três blocos dela: vale para os três. */
export const ColoridaComTresBlocos: Story = {
  args: { value: { name: "Destaques", width: "FULL", background: presets[2]!.colors.header }, sharedWith: 3 },
}

/** A faixa da barra de aviso: só a cor, com as palavras da barra. */
export const BarraDeAviso: Story = { args: { strip: true, value: { name: "", width: "FULL", background: presets[2]!.colors.primary } } }
