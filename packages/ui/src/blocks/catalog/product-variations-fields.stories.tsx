// React
import { useState } from "react"

// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Lib
import { EMPTY_VARIATIONS, type VariationsValue } from "@harness-monorepo/ui/lib/variations"

// Block
import { ProductVariationsFields } from "./product-variations-fields"
import { BASE_ROW, BLOUSE } from "./variation-fixtures"

function Controlled({ initial, trackStock = true }: { initial: VariationsValue; trackStock?: boolean }) {
  const [value, setValue] = useState(initial)
  return <ProductVariationsFields value={value} onChange={setValue} base={BASE_ROW} trackStock={trackStock} />
}

const meta = {
  title: "Blocos/Catálogo/Variações",
  component: ProductVariationsFields,
  parameters: { layout: "padded" },
  args: { value: EMPTY_VARIATIONS, onChange: () => {}, base: BASE_ROW, trackStock: true },
} satisfies Meta<typeof ProductVariationsFields>

export default meta
type Story = StoryObj<typeof meta>

/** Nenhuma opção: a linha de atalhos e a frase de que o produto usa o preço das seções. */
export const SemVariacoes: Story = {
  render: () => <Controlled initial={EMPTY_VARIATIONS} />,
}

/** A blusa do design 4a: dois tamanhos esgotados ou desligados, cores com bolinha. */
export const TamanhoECor: Story = {
  render: () => <Controlled initial={BLOUSE} />,
}

/** Sem controle de estoque, a coluna diz "Não contado" e o "Definir estoque" fica desligado. */
export const SemEstoque: Story = {
  render: () => <Controlled initial={BLOUSE} trackStock={false} />,
}

/** Os avisos que a tela escreve ao salvar: nome faltando e preço faltando numa linha. */
export const ComAvisos: Story = {
  args: {
    value: { ...BLOUSE, options: [...BLOUSE.options, { key: "empty", name: "", isColor: false, values: [] }] },
    errors: {
      options: { empty: "Dê um nome para a opção." },
      rows: { "P|areia": "Informe o preço de P · Areia." },
    },
  },
}
