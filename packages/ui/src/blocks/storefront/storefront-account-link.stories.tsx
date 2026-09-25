import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontAccountLink } from "./storefront-account-link"

const meta = {
  title: "Blocos/Vitrine/Conta do cabeçalho",
  component: StorefrontAccountLink,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), backgroundColor: "var(--shop-header)", color: "var(--shop-on-header)", padding: 16 }}>
        {Story()}
      </div>
    ),
  ],
  args: { href: "#" },
} satisfies Meta<typeof StorefrontAccountLink>

export default meta
type Story = StoryObj<typeof meta>

/** Sem sessão: um convite para entrar. */
export const Visitante: Story = { args: { name: null } }

/** Com sessão: o primeiro nome. */
export const Cliente: Story = { args: { name: "Bia Cliente" } }
