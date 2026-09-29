import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontLinkSpent } from "./storefront-link-spent"

const meta: Meta<typeof StorefrontLinkSpent> = {
  title: "Blocos/Vitrine/Link vencido",
  component: StorefrontLinkSpent,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[2]!.colors)}>{Story()}</div>],
}

export default meta
type Story = StoryObj<typeof StorefrontLinkSpent>

/** O link de confirmação vencido: manda outro dali mesmo. */
export const Confirmacao: Story = { args: { kind: "confirm", action: "#", hidden: {}, signInHref: "#" } }

/** O link de nova senha vencido: leva a pedir outro. */
export const NovaSenha: Story = { args: { kind: "reset", askHref: "#" } }
