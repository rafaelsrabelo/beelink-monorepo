// React
import { useState } from "react"

// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import type { ChoiceOption } from "@harness-monorepo/ui/lib/variant-choice"

// Block
import { StorefrontVariantOption } from "./storefront-variant-option"

const FLAVOUR: ChoiceOption = {
  id: "sabor",
  name: "Sabor",
  values: [
    { id: "frutas", name: "Frutas vermelhas", colorHex: null },
    { id: "limao", name: "Limão", colorHex: null },
    { id: "uva", name: "Uva", colorHex: null },
    { id: "maca", name: "Maçã verde", colorHex: null },
  ],
}

const SIZE: ChoiceOption = {
  id: "tamanho",
  name: "Tamanho",
  values: [
    { id: "150", name: "150 g", colorHex: null },
    { id: "300", name: "300 g", colorHex: null },
    { id: "600", name: "600 g", colorHex: null },
  ],
}

const meta = {
  title: "Blocos/Vitrine/Opção de variação",
  component: StorefrontVariantOption,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div className="max-w-[452px]">{Story()}</div>],
  args: {
    option: FLAVOUR,
    states: ["available", "available", "available", "soldOut"],
    prices: ["R$ 119,90", "R$ 119,90", "R$ 119,90", "R$ 119,90"],
    photos: FLAVOUR.values.map((value) => `https://picsum.photos/seed/${value.id}/240/140`),
    chosenId: "frutas",
    layout: "cards",
    onSelect: () => {},
  },
  render: (args) => {
    const [chosenId, setChosenId] = useState(args.chosenId)
    return <StorefrontVariantOption {...args} chosenId={chosenId} onSelect={setChosenId} />
  },
} satisfies Meta<typeof StorefrontVariantOption>

export default meta
type Story = StoryObj<typeof meta>

/** Os sabores do 5b: foto de cada um, Maçã verde esgotado e ainda escolhível. */
export const Cartoes: Story = {}

/** Sem foto nem cor, o cartão mostra um espaço reservado. */
export const CartoesSemFoto: Story = { args: { photos: [null, null, null, null] } }

/** Os tamanhos do 5b: pílulas com o preço embaixo de cada um. */
export const Pilulas: Story = {
  args: {
    option: SIZE,
    states: ["available", "available", "missing"],
    prices: ["R$ 69,90", "R$ 119,90", null],
    photos: [null, null, null],
    chosenId: "300",
    layout: "pills",
  },
}
