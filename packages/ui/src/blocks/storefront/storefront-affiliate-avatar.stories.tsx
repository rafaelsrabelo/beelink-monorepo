// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

// Block
import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontAffiliateAvatar } from "./storefront-affiliate-avatar"

const meta = {
  title: "Blocos/Vitrine/Afiliado/Rosto",
  component: StorefrontAffiliateAvatar,
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[2]!.colors)}>{Story()}</div>],
  args: { name: "João Silva", photoUrl: null, size: "lg" },
} satisfies Meta<typeof StorefrontAffiliateAvatar>

export default meta
type Story = StoryObj<typeof meta>

/** Sem foto: as iniciais, no tom da loja. */
export const Iniciais: Story = {}
