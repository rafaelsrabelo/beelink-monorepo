import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontAccountPrivacy } from "./storefront-account-privacy"

const meta = {
  title: "Blocos/Vitrine/Privacidade",
  component: StorefrontAccountPrivacy,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[2]!.colors)}>{Story()}</div>],
  args: { email: "rafael@exemplo.com", hasPassword: true, dataHref: "#", deleteAction: "#" },
} satisfies Meta<typeof StorefrontAccountPrivacy>

export default meta
type Story = StoryObj<typeof meta>

/** Como a 6h: baixar uma cópia e, dobrada, a exclusão. Abra "Excluir minha conta" para ver a confirmação. */
export const Padrao: Story = {}

/** Entrou pelo Google: confirma digitando o e-mail da conta. */
export const PeloGoogle: Story = { args: { hasPassword: false } }

/** Voltou recusada: a confirmação aberta, com o motivo. */
export const SenhaErrada: Story = { args: { error: "A senha não confere. Sua conta não foi excluída." } }
