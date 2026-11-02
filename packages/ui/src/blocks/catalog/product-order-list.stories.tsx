// React
import { useState } from "react"

// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { ProductOrderList } from "./product-order-list"
import type { ProductOrderItem } from "./product-order-row"

const base = { slug: "produto", priceCents: 13990, compareAtPriceCents: null, imageUrl: null, status: "ACTIVE", soldOut: false } as const

const products: ProductOrderItem[] = [
  { ...base, id: "1", name: "Whey Protein Concentrado 900g" },
  { ...base, id: "2", name: "Creatina Monohidratada 300g", soldOut: true },
  { ...base, id: "3", name: "Barra de Proteína", status: "DRAFT" },
  { ...base, id: "4", name: "Coqueteleira 600ml com um nome comprido para ver como a linha se comporta" },
]

const meta = {
  title: "Blocos/Catálogo/Ordem dos produtos",
  component: ProductOrderList,
  parameters: { layout: "padded" },
  args: { items: products, onReorder: () => {} },
  // Live, because the point of this block is the move: a static story draws arrows that do nothing.
  render: function Live(args) {
    const [items, setItems] = useState(args.items)

    return (
      <ProductOrderList
        {...args}
        items={items}
        onReorder={(ids) => setItems(ids.flatMap((id) => items.filter((item) => item.id === id)))}
      />
    )
  },
} satisfies Meta<typeof ProductOrderList>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** While the order is on its way to the API, nothing moves under it. */
export const Salvando: Story = { args: { disabled: true } }
