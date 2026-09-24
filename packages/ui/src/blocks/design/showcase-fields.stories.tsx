// Libs
import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { ShowcaseFields, type ShowcaseValue } from "./showcase-fields"

const categories = [
  { id: "c1", name: "Blusas" },
  { id: "c2", name: "Calças" },
]

const products = [
  { id: "p1", name: "Blusa azul" },
  { id: "p2", name: "Calça jeans" },
  { id: "p3", name: "Boné bordado" },
]

const base: ShowcaseValue = { source: "ALL", sourceCategoryId: "", picks: [], display: "RAIL", columns: 0, limit: "" }

let next = 0

const meta = {
  title: "Blocos/Modo design/Campos da vitrine",
  component: ShowcaseFields,
  parameters: { layout: "padded" },
  args: { value: base, onChange: () => {}, categories, products, newItemId: () => `novo-${(next += 1)}` },
  render: function Render(args) {
    const [value, setValue] = useState<ShowcaseValue>(args.value)
    return <ShowcaseFields {...args} value={value} onChange={(patch) => setValue({ ...value, ...patch })} />
  },
} satisfies Meta<typeof ShowcaseFields>

export default meta
type Story = StoryObj<typeof meta>

/** Todos os produtos, em trilho: o que toda vitrine desenhava antes de poder escolher. */
export const TodosEmTrilho: Story = {}

/** Uma categoria, com busca. */
export const UmaCategoria: Story = { args: { value: { ...base, source: "CATEGORY", sourceCategoryId: "c2" } } }

/** Escolhidos a dedo, em grade de três. */
export const EscolhidosEmGrade: Story = {
  args: {
    value: { ...base, source: "SELECTION", picks: [{ id: "a", productId: "p2" }], display: "GRID", columns: 3, limit: "12" },
  },
}
