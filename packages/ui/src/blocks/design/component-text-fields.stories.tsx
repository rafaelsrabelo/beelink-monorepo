// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { ComponentTextFields } from "./component-text-fields"

const meta = {
  title: "Blocos/Modo design/Palavras do bloco",
  component: ComponentTextFields,
  parameters: { layout: "padded" },
  args: {
    kind: "HEADING",
    value: { title: "Novidades da semana", subtitle: "Chegou agora", body: "" },
    onChange: () => {},
  },
  decorators: [
    (Story) => (
      <div className="flex max-w-lg flex-col gap-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ComponentTextFields>

export default meta
type Story = StoryObj<typeof meta>

/** Um título e a linha embaixo dele — o que a barra de aviso, as vitrines e o formulário também pedem. */
export const Titulo: Story = {}

/** Um parágrafo: só o texto, com as quebras de linha que a loja desenha. */
export const Paragrafo: Story = {
  args: { kind: "TEXT", value: { title: "", subtitle: "", body: "Entregamos em todo o Brasil.\nPeça pelo WhatsApp." } },
}
