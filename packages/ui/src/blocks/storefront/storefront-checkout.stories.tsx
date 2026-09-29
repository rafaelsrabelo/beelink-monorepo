import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontCheckout } from "./storefront-checkout"

const customer = {
  lines: ["Bia Cliente", "11988887777"],
  complete: true,
  editHref: "#",
  addresses: [{ id: "casa", heading: "Casa · Bia Cliente", line: "Av. Paulista, 1000 — São Paulo/SP" }],
  addAddressHref: "#",
}

const meta = {
  title: "Blocos/Vitrine/Fechar pedido",
  component: StorefrontCheckout,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), maxWidth: 320 }}>{Story()}</div>],
  args: {
    channel: "whatsapp",
    signIn: { signInHref: "#", signUpHref: "#" },
    customer: null,
    paymentMethods: ["PIX", "MONEY", "CREDIT_CARD"],
    choice: { fulfillment: "DELIVERY", addressId: "casa", paymentMethod: "PIX" },
    onChoiceChange: () => {},
    onPlace: () => {},
  },
} satisfies Meta<typeof StorefrontCheckout>

export default meta
type Story = StoryObj<typeof meta>

/** Um visitante: fazer o pedido pede para entrar, e o carrinho espera. */
export const Visitante: Story = {}

/** Uma cliente com sessão: os dados, como receber e pagar, e o botão. */
export const Cliente: Story = { args: { customer } }

/** O pedido a caminho da loja: nada se aperta duas vezes. */
export const Enviando: Story = { args: { customer, pending: true } }

/** Uma recusa, em palavras. */
export const Recusado: Story = { args: { customer, error: "Algum produto acabou enquanto você comprava. Confira o carrinho e tente de novo." } }

/** Uma loja sem WhatsApp: o pedido é feito do mesmo jeito, e a loja confirma. */
export const SemWhatsApp: Story = { args: { customer, channel: "shop" } }
