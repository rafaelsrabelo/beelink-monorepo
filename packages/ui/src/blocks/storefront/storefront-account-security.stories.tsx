import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontAccountSecurity } from "./storefront-account-security"

const meta = {
  title: "Blocos/Vitrine/Segurança",
  component: StorefrontAccountSecurity,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[2]!.colors)}>{Story()}</div>],
  args: { email: "rafael@exemplo.com", hasPassword: true, actions: { change: "#", create: "#", everywhere: "#" } },
} satisfies Meta<typeof StorefrontAccountSecurity>

export default meta
type Story = StoryObj<typeof meta>

/** Com senha: troca pedindo a atual, e sai de todos os aparelhos. */
export const ComSenha: Story = {}

/** Entrou pelo Google: cria a senha por um link no e-mail. */
export const PeloGoogle: Story = { args: { hasPassword: false } }

/** A senha atual não confere. */
export const SenhaAtualErrada: Story = { args: { error: "A senha atual não confere. Confira e tente de novo.", invalidField: "atual" } }

/** Depois de trocar. */
export const Trocada: Story = { args: { notice: "Pronto, sua senha foi trocada. Os outros aparelhos saíram da conta." } }
