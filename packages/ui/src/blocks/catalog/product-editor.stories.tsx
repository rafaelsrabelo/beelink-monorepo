// React
import { useState } from "react"

// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Lib
import { EMPTY_VARIATIONS, type VariationsValue } from "@harness-monorepo/ui/lib/variations"

// Block
import { ProductEditor } from "./product-editor"
import { EMPTY_PRODUCT, type ProductFormValues } from "./product-form-types"
import { BLOUSE } from "./variation-fixtures"

function Controlled({ initial, variations }: { initial: ProductFormValues; variations: VariationsValue }) {
  const [value, setValue] = useState(initial)
  const [draft, setDraft] = useState(variations)
  return (
    <ProductEditor
      value={value}
      onChange={setValue}
      categories={[]}
      shopSlug="lessari"
      productsWord="produtos"
      onUploadImage={async () => "https://picsum.photos/seed/blusa/800/800"}
      onSubmit={() => {}}
      onCancel={() => {}}
      submitLabel="Salvar"
      variations={{ value: draft, onChange: setDraft }}
      dirty={value !== initial || draft !== variations}
    />
  )
}

const blouse: ProductFormValues = { ...EMPTY_PRODUCT, name: "Blusa tomara que caia", price: "189,00", trackStock: true }

const meta = {
  title: "Blocos/Catálogo/Cadastro de produto",
  component: ProductEditor,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ProductEditor>

export default meta
type Story = StoryObj<typeof meta>

/** Um produto que vende uma coisa só: preço e estoque nas seções deles. */
export const SemVariacoes: Story = {
  args: {} as never,
  render: () => <Controlled initial={blouse} variations={EMPTY_VARIATIONS} />,
}

/** Com tamanho e cor: preço e estoque passam para a tabela de combinações. */
export const ComVariacoes: Story = {
  args: {} as never,
  render: () => <Controlled initial={blouse} variations={BLOUSE} />,
}
