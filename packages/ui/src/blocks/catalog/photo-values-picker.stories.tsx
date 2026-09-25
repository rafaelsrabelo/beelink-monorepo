// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { PhotoValuesPicker } from "./photo-values-picker"
import { WHEY } from "./variation-fixtures"

const meta = {
  title: "Blocos/Catálogo/Variações/Variações de uma foto",
  component: PhotoValuesPicker,
  parameters: { layout: "centered" },
  decorators: [(Story) => <div className="w-44">{Story()}</div>],
  args: { options: WHEY.options, value: [], onChange: () => {}, number: 1 },
} satisfies Meta<typeof PhotoValuesPicker>

export default meta
type Story = StoryObj<typeof meta>

/** Sem marca: a foto aparece em todas as combinações. */
export const Todas: Story = {}

/** O pote de Morango, em qualquer peso. */
export const UmSabor: Story = { args: { value: ["Morango"], number: 2 } }

/** O pote de 900g de Morango, e nenhuma outra combinação. */
export const UmaCombinacao: Story = { args: { value: ["Morango", "900g"], number: 3 } }
