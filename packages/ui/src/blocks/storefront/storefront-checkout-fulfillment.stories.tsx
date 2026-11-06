import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontCheckoutFulfillment } from "./storefront-checkout-fulfillment"

const meta = {
  title: "Blocos/Vitrine/Como receber",
  component: StorefrontCheckoutFulfillment,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), maxWidth: 360 }}>{Story()}</div>],
  args: {
    value: { fulfillment: "DELIVERY", addressId: "casa", paymentMethod: null, wayId: null },
    onChange: () => {},
    addresses: [{ id: "casa", heading: "Casa · Bia Cliente", line: "Av. Paulista, 1000 — Bela Vista — São Paulo/SP" }],
    addHref: "#",
  },
} satisfies Meta<typeof StorefrontCheckoutFulfillment>

export default meta
type Story = StoryObj<typeof meta>

/** Entrega no endereço salvo, ou retirar na loja. */
export const Padrao: Story = {}

/** A loja não entrega nem recebe retiradas agora. */
export const SemJeito: Story = { args: { shipping: { delivery: false, pickup: false, ways: [], note: null } } }
