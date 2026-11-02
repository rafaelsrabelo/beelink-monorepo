// React
import { useState, type ComponentProps } from "react"

// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import type { ProductOrderItem } from "./product-order-row"
import { ProductOrderShelf } from "./product-order-shelf"

const base = { imageUrl: null, compareAtPriceCents: null, status: "ACTIVE", soldOut: false } as const

const products: ProductOrderItem[] = [
  { ...base, id: "1", slug: "whey", name: "Whey Protein Concentrado 900g", priceCents: 13990, compareAtPriceCents: 15990 },
  { ...base, id: "2", slug: "creatina", name: "Creatina Monohidratada 300g", priceCents: 8990, soldOut: true },
  { ...base, id: "3", slug: "barra", name: "Barra de Proteína", priceCents: 1190, status: "DRAFT" },
  { ...base, id: "4", slug: "coqueteleira", name: "Coqueteleira 600ml", priceCents: 3490 },
  { ...base, id: "5", slug: "pre-treino", name: "Pré-treino 300g", priceCents: 11990 },
]

function Inert(props: ComponentProps<"a"> & { href: string }) {
  return <a {...props} href={undefined} />
}

const meta = {
  title: "Blocos/Catálogo/Ordem dos produtos na vitrine",
  component: ProductOrderShelf,
  parameters: { layout: "padded" },
  args: { items: products, onReorder: () => {}, linkComponent: Inert },
  // Live, because the point of this block is the drag: a static story draws cards that stay put.
  render: function Live(args) {
    const [items, setItems] = useState(args.items)

    return (
      <ProductOrderShelf
        {...args}
        items={items}
        onReorder={(ids) => setItems(ids.flatMap((id) => items.filter((item) => item.id === id)))}
      />
    )
  },
} satisfies Meta<typeof ProductOrderShelf>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** While the order is on its way to the API, nothing moves under it. */
export const Salvando: Story = { args: { disabled: true } }
