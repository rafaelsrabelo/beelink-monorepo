import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontNewPassword } from "./storefront-new-password"

const meta = {
  title: "Blocos/Vitrine/Nova senha",
  component: StorefrontNewPassword,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[2]!.colors)}>{Story()}</div>],
  args: { action: "#", hidden: { token: "t0k3n" }, legalHrefs: { terms: "#", privacy: "#" } },
} satisfies Meta<typeof StorefrontNewPassword>

export default meta
type Story = StoryObj<typeof meta>

/** Vinda do link do e-mail: a senha nova, duas vezes. */
export const Padrao: Story = {}

/** As duas senhas não batem. */
export const Diferentes: Story = { args: { error: "As duas senhas não são iguais. Digite de novo.", invalidField: "confirmacao" } }
