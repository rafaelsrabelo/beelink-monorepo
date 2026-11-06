// React
import { useState } from "react"

// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { importCategories, importRows } from "./product-import-fixtures"
import { ProductImportReview, type ProductImportReviewProps } from "./product-import-review"
import type { ProductImportRow } from "./product-import-types"

/** Holds the rows, so the story can be typed in the way the screen will be. */
function Live(props: ProductImportReviewProps) {
  const [rows, setRows] = useState<ProductImportRow[]>([...props.rows])
  return <ProductImportReview {...props} rows={rows} onChange={setRows} />
}

const meta = {
  title: "Blocos/Catálogo/Importar produtos — revisão",
  component: ProductImportReview,
  parameters: { layout: "padded" },
  args: { rows: importRows, categories: importCategories, onChange: () => {}, onSubmit: () => {}, onRestart: () => {} },
  render: (args) => <Live {...args} />,
} satisfies Meta<typeof ProductImportReview>

export default meta
type Story = StoryObj<typeof meta>

/** One row came without a price: the import waits for it. */
export const ComLinhaSemPreco: Story = {}

export const Pronta: Story = {
  args: { rows: importRows.map((row) => (row.price === "" ? { ...row, price: "7,00" } : row)) },
}

/** A name the shop already has: it waits to be renamed or unticked. */
export const NomeQueALojaJaTem: Story = {
  args: { rows: importRows.map((row) => (row.price === "" ? { ...row, price: "7,00" } : row)), takenSlugs: ["picole-de-uva"] },
}

export const Importando: Story = { args: { pending: true } }

export const Recusada: Story = {
  args: { error: "Um produto entrou na loja com o mesmo endereço enquanto você revisava. Tente importar de novo." },
}
