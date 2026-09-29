import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontAddressCards } from "./storefront-address-cards"

const home = {
  id: "casa",
  heading: "Casa · Rafael Souza",
  lines: ["Rua Tibúrcio Cavalcante, 1200, apto 302", "Meireles, Fortaleza/CE", "60160-230"],
  isDefault: true,
  editHref: "#",
}
const work = {
  id: "trabalho",
  heading: "Trabalho · Rafael Souza",
  lines: ["Av. Santos Dumont, 3000, sala 1104", "Aldeota, Fortaleza/CE", "60150-162"],
  isDefault: false,
  editHref: "#",
}

const meta = {
  title: "Blocos/Vitrine/Endereços",
  component: StorefrontAddressCards,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[2]!.colors)}>{Story()}</div>],
  args: { addresses: [home, work], addHref: "#", limit: 10, removeAction: "#", defaultAction: "#" },
} satisfies Meta<typeof StorefrontAddressCards>

export default meta
type Story = StoryObj<typeof meta>

/** Casa, a padrão, e Trabalho: como na 6h. */
export const Padrao: Story = {}

/** Nenhum endereço salvo: só o convite para adicionar. */
export const Vazio: Story = { args: { addresses: [] } }

/** Um endereço sem apelido, como o que a migração trouxe: só quem recebe. */
export const SemApelido: Story = { args: { addresses: [{ ...home, heading: "Rafael Souza" }] } }

/** Depois de salvar. */
export const Salvo: Story = { args: { notice: "Pronto, o endereço foi salvo." } }

/** No máximo de endereços: não há como adicionar outro. */
export const NoLimite: Story = { args: { addHref: null } }
