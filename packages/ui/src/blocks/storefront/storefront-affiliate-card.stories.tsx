// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

// Block
import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontAffiliateCard } from "./storefront-affiliate-card"

const meta = {
  title: "Blocos/Vitrine/Afiliado/Cartão da chegada",
  component: StorefrontAffiliateCard,
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[2]!.colors)}>{Story()}</div>],
  args: { name: "João Silva", photoUrl: null, tagline: "Separei meus favoritos da loja aqui embaixo" },
} satisfies Meta<typeof StorefrontAffiliateCard>

export default meta
type Story = StoryObj<typeof meta>

/** A chegada pelo link: o nome inteiro e a frase do afiliado. Sem foto, as iniciais. */
export const ComFrase: Story = {}

/** Sem frase: só quem indicou. */
export const SemFrase: Story = { args: { tagline: null } }
