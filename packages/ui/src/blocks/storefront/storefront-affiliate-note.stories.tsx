// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

// Block
import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontAffiliateNote } from "./storefront-affiliate-note"

const meta = {
  title: "Blocos/Vitrine/Afiliado/Linha do pedido",
  component: StorefrontAffiliateNote,
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), maxWidth: 360 }}>{Story()}</div>],
  args: { name: "João Silva", photoUrl: null },
} satisfies Meta<typeof StorefrontAffiliateNote>

export default meta
type Story = StoryObj<typeof meta>

/** No carrinho e no checkout: de quem é a indicação, e que essa pessoa verá o nome de quem compra. */
export const Padrao: Story = {}
