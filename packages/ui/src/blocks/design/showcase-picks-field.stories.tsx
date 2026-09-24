// Libs
import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { ShowcasePicksField, type ShowcasePick } from "./showcase-picks-field"

const products = [
  { id: "p1", name: "Blusa azul" },
  { id: "p2", name: "Calça jeans" },
  { id: "p3", name: "Boné bordado" },
  { id: "p4", name: "Moletom cinza" },
]

let next = 0

const meta = {
  title: "Blocos/Modo design/Produtos escolhidos",
  component: ShowcasePicksField,
  parameters: { layout: "padded" },
  args: {
    value: [
      { id: "a", productId: "p2" },
      { id: "b", productId: "p1" },
    ],
    onChange: () => {},
    products,
    newItemId: () => `novo-${(next += 1)}`,
  },
  render: function Render(args) {
    const [value, setValue] = useState<ShowcasePick[]>([...args.value])
    return <ShowcasePicksField {...args} value={value} onChange={setValue} />
  },
} satisfies Meta<typeof ShowcasePicksField>

export default meta
type Story = StoryObj<typeof meta>

/** Suba, desça e tire; a busca embaixo só oferece o que ainda não está na lista. */
export const Padrao: Story = {}

export const Vazia: Story = { args: { value: [] } }
