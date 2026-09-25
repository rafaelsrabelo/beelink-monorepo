// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

// Block
import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontProductDetails } from "./storefront-product-details"

const meta = {
  title: "Blocos/Vitrine/Produto · descrição e informações técnicas",
  component: StorefrontProductDetails,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[2]!.colors)}>{Story()}</div>],
  args: {
    description: "O Haze Hardcore é o pré-treino para quem treina pesado.\n\n**Modo de uso:** 1 dosador em 200 ml de água.",
    specs: [
      { label: "Categoria", value: "Pré-treino" },
      { label: "Sabor", value: "Frutas vermelhas, Limão, Uva, Maçã verde" },
      { label: "Tamanho", value: "150 g, 300 g, 600 g" },
    ],
  },
} satisfies Meta<typeof StorefrontProductDetails>

export default meta
type Story = StoryObj<typeof meta>

/** A descrição ao lado das informações técnicas, como no 5b. */
export const Padrao: Story = {}

/** Só a descrição, na largura toda. */
export const SemInformacoes: Story = { args: { specs: [] } }
