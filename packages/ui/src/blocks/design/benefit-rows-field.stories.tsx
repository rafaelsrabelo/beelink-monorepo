// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { BenefitRowsField } from "./benefit-rows-field"

const meta = {
  title: "Blocos/Modo design/Vantagens",
  component: BenefitRowsField,
  parameters: { layout: "padded" },
  args: {
    value: [
      { id: "b1", icon: "truck", title: "Entrega rápida", detail: "Em até 2 dias" },
      { id: "b2", icon: "qr-code", title: "PIX", detail: "Na hora" },
      { id: "b3", icon: "refresh-cw", title: "Troca fácil", detail: "30 dias" },
    ],
    onChange: () => {},
    newRowId: () => `new-${Math.random().toString(36).slice(2, 8)}`,
  },
  decorators: [
    (Story) => (
      <div className="max-w-lg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BenefitRowsField>

export default meta
type Story = StoryObj<typeof meta>

/**
 * As promessas, escritas pelo dono. Costumavam ser derivadas das formas de pagamento, com as
 * palavras da plataforma; isto é o que as tornou editáveis. O ícone se escolhe olhando, numa
 * grade, e não numa lista de nomes.
 */
export const Padrao: Story = {}

/** Antes da primeira promessa: só o convite. */
export const Vazio: Story = { args: { value: [] } }
