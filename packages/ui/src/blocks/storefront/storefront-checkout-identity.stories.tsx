import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontCheckoutIdentity } from "./storefront-checkout-identity"

const meta = {
  title: "Blocos/Vitrine/Seus dados no checkout",
  component: StorefrontCheckoutIdentity,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), maxWidth: 360 }}>{Story()}</div>],
  args: { email: null, action: "#", hidden: {}, hrefs: { signIn: "#", signUp: "#", terms: "#", privacy: "#" } },
} satisfies Meta<typeof StorefrontCheckoutIdentity>

export default meta
type Story = StoryObj<typeof meta>

/** No lugar de "Entre para fazer o pedido": nome, telefone e e-mail, sem senha, sem código. */
export const Formulario: Story = {}

/** Recusado: o e-mail digitado volta, com a frase. */
export const Recusado: Story = { args: { email: "bia@exemplo.com", error: "Confira o nome, o e-mail e o WhatsApp com DDD." } }
