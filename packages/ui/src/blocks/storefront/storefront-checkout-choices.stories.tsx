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
    value: { fulfillment: "DELIVERY", paymentMethod: "PIX" },
    onChange: () => {},
    deliveryLine: "Av. Paulista, 1000 — Bela Vista — São Paulo/SP",
    editHref: "#",
    paymentMethods: ["PIX", "MONEY", "CREDIT_CARD", "DEBIT_CARD"],
  },
} satisfies Meta<typeof StorefrontCheckoutChoices>

export default meta
type Story = StoryObj<typeof meta>

/** Entrega no endereço cadastrado, Pix escolhido. */
export const Entrega: Story = {}

/** Sem endereço no cadastro: a entrega fica indisponível, com o caminho para cadastrar. */
export const SemEndereco: Story = { args: { deliveryLine: null, value: { fulfillment: "PICKUP", paymentMethod: null } } }
