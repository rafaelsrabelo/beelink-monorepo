// Libs
import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { FeaturedProductFields } from "./featured-product-fields"
import type { ShowcasePick } from "./showcase-picks-field"

const meta = {
  title: "Blocos/Modo design/Produto em destaque",
  component: FeaturedProductFields,
  parameters: { layout: "padded" },
  args: {
    value: [{ id: "pick", productId: "p1" }],
    onChange: () => {},
    products: [
      { id: "p1", name: "Whey Baunilha 900 g" },
      { id: "p2", name: "Creatina 300 g" },
      { id: "p3", name: "Coqueteleira" },
    ],
    newItemId: () => "novo",
  },
  render: function Render(args) {
    const [value, setValue] = useState<ShowcasePick[]>([...args.value])
    return <FeaturedProductFields {...args} value={value} onChange={setValue} />
  },
} satisfies Meta<typeof FeaturedProductFields>

export default meta
type Story = StoryObj<typeof meta>

/** O produto escolhido e a busca para trocar. */
export const Padrao: Story = {}

export const NenhumEscolhido: Story = { args: { value: [] } }

/** Um produto apagado depois de escolhido: diz que não foi encontrado. */
export const NaoEncontrado: Story = { args: { value: [{ id: "pick", productId: "apagado" }] } }
