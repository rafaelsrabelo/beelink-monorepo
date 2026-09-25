import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontAccountForm } from "./storefront-account-form"

const meta = {
  title: "Blocos/Vitrine/Minha conta",
  component: StorefrontAccountForm,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), backgroundColor: "var(--shop-canvas)", padding: 24 }}>{Story()}</div>],
  args: {
    action: "#",
    signOutAction: "#",
    profile: {
      name: "Bia Cliente",
      email: "bia@exemplo.com",
      phone: null,
      address: { zipCode: null, street: null, number: null, complement: null, neighborhood: null, city: null, state: null },
    },
  },
} satisfies Meta<typeof StorefrontAccountForm>

export default meta
type Story = StoryObj<typeof meta>

/** A primeira visita: só o nome e o e-mail da conta. */
export const Nova: Story = {}

export const Salvo: Story = { args: { saved: true } }
