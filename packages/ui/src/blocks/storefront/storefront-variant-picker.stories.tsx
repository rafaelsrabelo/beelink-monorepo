// React
import { useState } from "react"

// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { StorefrontVariantPicker } from "./storefront-variant-picker"
import { BLOUSE_OPTIONS, BLOUSE_VARIANTS } from "./variant-choice-fixtures"

const meta = {
  title: "Blocos/Vitrine/Seletor de variação",
  component: StorefrontVariantPicker,
  parameters: { layout: "padded" },
  args: { options: BLOUSE_OPTIONS, variants: BLOUSE_VARIANTS, selection: { size: "P", colour: "areia" }, onSelect: () => {} },
} satisfies Meta<typeof StorefrontVariantPicker>

export default meta
type Story = StoryObj<typeof meta>

/** P · Areia escolhida: M esgotado mas escolhível, G indisponível nesta cor. */
export const Padrao: Story = {
  render: (args) => {
    const [selection, setSelection] = useState(args.selection)
    return (
      <StorefrontVariantPicker
        {...args}
        selection={selection}
        onSelect={(optionId, valueId) => setSelection({ ...selection, [optionId]: valueId })}
      />
    )
  },
}

/** Como a página do produto o mostra: o preço em cada valor e a foto de cada cor no seu cartão. */
export const ComPrecosEFotos: Story = {
  ...Padrao,
  args: {
    locale: "pt-BR",
    images: BLOUSE_OPTIONS[1]!.values.map((value) => ({ url: `https://picsum.photos/seed/${value.id}/240/140`, optionValueIds: [value.id] })),
  },
}
