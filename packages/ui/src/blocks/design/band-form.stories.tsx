// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { sampleColorPresets as presets } from "../store/store.fixtures"
import { BandForm } from "./band-form"

const meta = {
  title: "Blocos/Modo design/Formulário da faixa",
  component: BandForm,
  parameters: { layout: "padded" },
  args: {
    value: { width: "CONTAINED", background: "" },
    onChange: () => {},
    pageBackground: presets[0]!.colors.background,
    onSubmit: () => {},
    onCancel: () => {},
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BandForm>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Os dois atributos de uma faixa: largura e cor. Não há cor de texto, e a ausência é a promessa —
 * o que está escrito na faixa deriva da cor dela, e o dono não consegue escolher duas que façam
 * as próprias palavras sumirem.
 */
export const Padrao: Story = {}

/** Com cor própria e ponta a ponta: uma faixa escura, como uma capa ou um destaque. */
export const Colorida: Story = { args: { value: { width: "FULL", background: presets[2]!.colors.header } } }
