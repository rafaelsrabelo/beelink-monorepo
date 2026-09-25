import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontSignIn } from "./storefront-sign-in"

const meta = {
  title: "Blocos/Vitrine/Entrar na loja",
  component: StorefrontSignIn,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), backgroundColor: "var(--shop-canvas)", padding: 24 }}>{Story()}</div>],
  args: { mode: "entrar", action: "#", hidden: {}, hrefs: { signIn: "#", signUp: "#", forgot: "#" } },
} satisfies Meta<typeof StorefrontSignIn>

export default meta
type Story = StoryObj<typeof meta>

export const Entrar: Story = {}

export const CriarConta: Story = { args: { mode: "criar" } }

export const NovaSenha: Story = { args: { mode: "senha" } }

/** Uma recusa, já em frase. */
export const Recusado: Story = { args: { error: "E-mail ou senha incorretos.", email: "bia@exemplo.com" } }

/** Depois de criar a conta: o link está a caminho. */
export const LinkEnviado: Story = { args: { mode: "criar", sent: true, email: "bia@exemplo.com" } }
