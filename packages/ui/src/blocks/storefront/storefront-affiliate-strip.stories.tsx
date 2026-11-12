// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

// Block
import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontAffiliateStrip } from "./storefront-affiliate-strip"

const meta = {
  title: "Blocos/Vitrine/Afiliado/Faixa",
  component: StorefrontAffiliateStrip,
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[2]!.colors)}>{Story()}</div>],
  args: { name: "João Silva", photoUrl: null, onDismiss: () => {} },
} satisfies Meta<typeof StorefrontAffiliateStrip>

export default meta
type Story = StoryObj<typeof meta>

/** Nas páginas depois da chegada: uma linha, o primeiro nome, e o "×". */
export const Padrao: Story = {}
