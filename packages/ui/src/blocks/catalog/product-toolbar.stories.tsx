// React
import { useState } from "react"

// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Locales
import { en } from "../../locales/en"

// Block
import { EMPTY_PRODUCT_FILTERS, ProductToolbar, type ProductFilters } from "./product-toolbar"

const categories = [
  { id: "c1", name: "Proteínas" },
  { id: "c2", name: "Whey", parentName: "Proteínas" },
  { id: "c3", name: "Blusas" },
]

const meta = {
  title: "Blocos/Catálogo/Filtros de produtos",
  component: ProductToolbar,
  parameters: { layout: "padded" },
  args: { value: EMPTY_PRODUCT_FILTERS, onChange: () => {}, categories },
  // Live, because the point of this block is what happens when a filter is picked — a static
  // story would show four triggers that never change.
  render: function Live(args) {
    const [value, setValue] = useState<ProductFilters>(args.value)

    return <ProductToolbar {...args} value={value} onChange={setValue} />
  },
} satisfies Meta<typeof ProductToolbar>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** Once anything is set, the way out appears — and not before. */
export const ComFiltros: Story = {
  args: { value: { ...EMPTY_PRODUCT_FILTERS, status: "DRAFT", stock: "OUT_OF_STOCK", search: "whey" } },
}

export const EmIngles: Story = { args: { messages: en } }
