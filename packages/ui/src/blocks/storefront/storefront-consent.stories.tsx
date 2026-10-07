// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Lib
import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

// Block
import { sampleColorPresets, sampleDarkShopColors } from "../store/store.fixtures"
import { StorefrontConsent } from "./storefront-consent"

const meta = {
  title: "Blocos/Vitrine/Aviso de cookies",
  component: StorefrontConsent,
  parameters: { layout: "fullscreen" },
  // The strip reads the shop's variables, which the shop's layout sets; alone, it is dressed here.
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[2]!.colors)}>{Story()}</div>],
  args: { privacyHref: "#", onAccept: () => {}, onRefuse: () => {} },
} satisfies Meta<typeof StorefrontConsent>

export default meta
type Story = StoryObj<typeof meta>

/** A primeira visita a uma loja com Pixel da Meta: dois botões iguais, nenhum marcado. */
export const PrimeiraVisita: Story = {}

/** Reaberto pelo "Cookies" do rodapé, por quem já aceitou. */
export const ReabertoAceito: Story = { args: { current: "granted" } }

/** Reaberto por quem recusou. */
export const ReabertoRecusado: Story = { args: { current: "denied" } }

/** Numa loja de página escura: as cores são as da loja, e o contraste a acompanha. */
export const LojaEscura: Story = {
  decorators: [(Story) => <div style={shopPaletteStyle(sampleDarkShopColors)}>{Story()}</div>],
}
