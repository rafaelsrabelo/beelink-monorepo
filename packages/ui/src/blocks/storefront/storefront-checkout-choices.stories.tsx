import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontCheckoutChoices } from "./storefront-checkout-choices"

const meta = {
  title: "Blocos/Vitrine/Como receber e pagar",
  component: StorefrontCheckoutChoices,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), maxWidth: 320 }}>{Story()}</div>],
  args: {
    value: { fulfillment: "DELIVERY", addressId: "casa", paymentMethod: "PIX" },
    onChange: () => {},
    addresses: [{ id: "casa", heading: "Casa · Bia Cliente", line: "Av. Paulista, 1000 — Bela Vista — São Paulo/SP" }],
    addHref: "#",
    paymentMethods: ["PIX", "MONEY", "CREDIT_CARD", "DEBIT_CARD"],
  },
} satisfies Meta<typeof StorefrontCheckoutChoices>

export default meta
type Story = StoryObj<typeof meta>

/** Entrega no único endereço salvo, Pix escolhido. */
export const Entrega: Story = {}

/** Vários endereços salvos: a entrega oferece a escolha, com o padrão marcado. */
export const VariosEnderecos: Story = {
  args: {
    addresses: [
      { id: "casa", heading: "Casa · Bia Cliente", line: "Av. Paulista, 1000 — Bela Vista — São Paulo/SP" },
      { id: "trabalho", heading: "Trabalho · Recepção", line: "Av. Brigadeiro Faria Lima, 3477 — Itaim Bibi — São Paulo/SP" },
    ],
  },
}

/** Sem endereço salvo: a entrega fica indisponível, com o caminho para cadastrar. */
export const SemEndereco: Story = { args: { addresses: [], value: { fulfillment: "PICKUP", addressId: null, paymentMethod: null } } }
