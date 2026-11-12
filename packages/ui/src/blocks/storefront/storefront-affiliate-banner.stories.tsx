// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

// Block
import { sampleColorPresets, sampleDarkShopColors } from "../store/store.fixtures"
import { StorefrontAffiliateBanner } from "./storefront-affiliate-banner"

const meta = {
  title: "Blocos/Vitrine/Afiliado/Faixa",
  component: StorefrontAffiliateBanner,
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[2]!.colors)}>{Story()}</div>],
  args: { name: "Margarida Marino Pereira", photoUrl: null, tagline: null },
} satisfies Meta<typeof StorefrontAffiliateBanner>

export default meta
type Story = StoryObj<typeof meta>

/** Pelo link (`/<nome>` ou `?afiliado=`): sem foto, as iniciais. */
export const Chegada: Story = {}

/** Com a frase do afiliado, numa linha embaixo do nome. */
export const ChegadaComFrase: Story = { args: { tagline: "Separei meus favoritos da loja aqui embaixo" } }

/** Uma loja de marca clara (amarela): o texto troca para a cor legível sobre ela. */
export const MarcaClara: Story = {
  decorators: [(Story) => <div style={shopPaletteStyle(sampleDarkShopColors)}>{Story()}</div>],
}
