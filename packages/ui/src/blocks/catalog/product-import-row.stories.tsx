// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { importCategories, importRows } from "./product-import-fixtures"
import { ProductImportRow } from "./product-import-row"

const meta = {
  title: "Blocos/Catálogo/Importar produtos — linha",
  component: ProductImportRow,
  parameters: { layout: "padded" },
  args: { row: importRows[0]!, categories: importCategories, onChange: () => {} },
  render: (args) => (
    <ul>
      <ProductImportRow {...args} />
    </ul>
  ),
} satisfies Meta<typeof ProductImportRow>

export default meta
type Story = StoryObj<typeof meta>

/** Flavours, one priced apart, and a category the document named that the shop does not have. */
export const ComSabores: Story = {}

export const SemPreco: Story = { args: { row: importRows[2]! } }

export const Desmarcada: Story = { args: { row: { ...importRows[1]!, include: false } } }
