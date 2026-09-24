// Libs
import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { CategoriesFields, type CategoriesValue } from "./categories-fields"

const meta = {
  title: "Blocos/Modo design/Campos das categorias",
  component: CategoriesFields,
  parameters: { layout: "padded" },
  args: { value: { display: "RAIL", columns: 0 }, onChange: () => {} },
  render: function Render(args) {
    const [value, setValue] = useState<CategoriesValue>(args.value)
    return <CategoriesFields {...args} value={value} onChange={(next) => setValue({ ...value, ...next })} />
  },
} satisfies Meta<typeof CategoriesFields>

export default meta
type Story = StoryObj<typeof meta>

/** Em trilho: as categorias rolam para o lado, e as colunas não são perguntadas. */
export const EmTrilho: Story = {}

/** Em grade: quantas colunas, ou "automático". */
export const EmGrade: Story = { args: { value: { display: "GRID", columns: 4 } } }
