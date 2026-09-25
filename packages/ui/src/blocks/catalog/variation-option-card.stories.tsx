// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { VariationOptionCard } from "./variation-option-card"
import { BLOUSE } from "./variation-fixtures"

const noop = () => {}

const meta = {
  title: "Blocos/Catálogo/Variações/Cartão de opção",
  component: VariationOptionCard,
  parameters: { layout: "padded" },
  args: {
    option: BLOUSE.options[0]!,
    number: 1,
    onRename: noop,
    onAddValue: noop,
    onRemoveValue: noop,
    onReorderValues: noop,
    onColor: noop,
    onRemove: noop,
  },
} satisfies Meta<typeof VariationOptionCard>

export default meta
type Story = StoryObj<typeof meta>

export const Tamanho: Story = {}

/** Uma opção de cor: cada valor tem a bolinha que o cliente vê. */
export const Cor: Story = { args: { option: BLOUSE.options[1]!, number: 2 } }

/** Recém-criada por "Outra": sem nome e sem valores. */
export const Nova: Story = {
  args: { option: { key: "new", name: "", isColor: false, values: [] }, error: "Adicione pelo menos um valor." },
}
