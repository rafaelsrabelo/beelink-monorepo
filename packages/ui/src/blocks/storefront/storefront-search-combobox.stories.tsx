import { useState, type CSSProperties } from "react"

import type { Meta, StoryObj } from "@storybook/react-vite"

import { StorefrontSearchCombobox, type StorefrontSuggestion } from "./storefront-search-combobox"

const suggestions: StorefrontSuggestion[] = [
  { id: "1", label: "Whey Protein Concentrado 900g", href: "/loja/produtos/whey", imageUrl: "https://picsum.photos/seed/w/80/80", price: "R$ 139,90" },
  { id: "2", label: "Whey Protein Isolado 900g", href: "/loja/produtos/iso", imageUrl: "https://picsum.photos/seed/i/80/80", price: "R$ 189,90" },
  { id: "3", label: "Creatina Monohidratada 300g", href: "/loja/produtos/crea", imageUrl: null, price: "R$ 89,90" },
]

/** Controlled from the outside, exactly as the screen does it. */
function Harness(args: Partial<React.ComponentProps<typeof StorefrontSearchCombobox>>) {
  const [value, setValue] = useState("whey")

  return (
    <div
      className="p-6"
      style={{ "--shop-background": "oklch(1 0 0)", "--shop-text": "oklch(0.15 0 0)", "--shop-primary": "oklch(0.6 0.22 25)" } as CSSProperties}
    >
      <StorefrontSearchCombobox
        action="/loja/busca"
        value={value}
        onValueChange={setValue}
        suggestions={suggestions}
        total={18}
        seeAllHref="/loja/busca?q=whey"
        {...args}
      />
    </div>
  )
}

const meta = {
  title: "Blocos/Vitrine/Busca com sugestões",
  component: StorefrontSearchCombobox,
  parameters: { layout: "fullscreen" },
  render: (args) => <Harness {...args} />,
  args: { action: "/loja/busca", value: "whey", onValueChange: () => {}, suggestions },
} satisfies Meta<typeof StorefrontSearchCombobox>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** Enquanto a resposta não chega, a lista diz que está buscando em vez de ficar muda. */
export const Buscando: Story = {
  render: () => <Harness suggestions={[]} pending />,
}

/** No header, que é escuro: o campo vira claro para o placeholder não ler como desabilitado. */
export const NoHeaderEscuro: Story = {
  render: () => (
    <div style={{ backgroundColor: "oklch(0.15 0 0)" }}>
      <Harness tone="panel" />
    </div>
  ),
}
