import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontAccountNotices } from "./storefront-account-notices"

const meta = {
  title: "Blocos/Vitrine/Avisos por e-mail",
  component: StorefrontAccountNotices,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[2]!.colors)}>{Story()}</div>],
  args: { email: "rafael@exemplo.com", notices: { orders: true, favorites: true, cashback: true, offers: false }, action: "#" },
} satisfies Meta<typeof StorefrontAccountNotices>

export default meta
type Story = StoryObj<typeof meta>

/** Como começa: andamento e favoritos ligados, ofertas desligadas. */
export const Padrao: Story = {}

/** Aceitou ofertas, com a data. */
export const ComOfertas: Story = { args: { notices: { orders: true, favorites: false, cashback: true, offers: true }, offersSince: "29/09/2026" } }

/** Depois de salvar. */
export const Salvo: Story = { args: { notice: "Pronto, seus avisos foram salvos." } }
