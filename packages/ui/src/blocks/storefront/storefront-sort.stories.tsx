import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontSort } from "./storefront-sort"

const meta = {
  title: "Blocos/Vitrine/Ordenação",
  component: StorefrontSort,
  parameters: { layout: "centered" },
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[2]!.colors)}>{Story()}</div>],
  args: {
    action: "#",
    name: "ordenar",
    value: "relevancia",
    options: [
      { value: "relevancia", label: "Mais relevantes" },
      { value: "menor-preco", label: "Menor preço" },
      { value: "maior-preco", label: "Maior preço" },
      { value: "maior-desconto", label: "Maior desconto" },
      { value: "novidades", label: "Lançamentos" },
    ],
  },
} satisfies Meta<typeof StorefrontSort>

export default meta
type Story = StoryObj<typeof meta>

/** O "Ordenar por" de 5a. Mudar a opção envia o formulário; sem JavaScript, aparece um botão. */
export const Padrao: Story = {}
