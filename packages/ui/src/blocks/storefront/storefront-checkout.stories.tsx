import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontCheckout } from "./storefront-checkout"

const meta = {
  title: "Blocos/Vitrine/Fechar pedido",
  component: StorefrontCheckout,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), maxWidth: 320 }}>{Story()}</div>],
  args: { href: "#", signIn: { signInHref: "#", signUpHref: "#" }, customer: null },
} satisfies Meta<typeof StorefrontCheckout>

export default meta
type Story = StoryObj<typeof meta>

/** Um visitante: fazer o pedido pede para entrar, e o carrinho espera. */
export const Visitante: Story = {}

/** Uma cliente com sessão: os dados como a loja guarda, e o botão. */
export const Cliente: Story = {
  args: { customer: { lines: ["Bia Cliente", "11988887777", "Av. Paulista, 1000 — São Paulo/SP"], complete: true, editHref: "#" } },
}

/** Uma loja sem WhatsApp: nenhum botão, e o porquê. */
export const SemWhatsApp: Story = { args: { href: null } }
