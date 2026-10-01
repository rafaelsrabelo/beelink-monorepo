import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontFavoriteButton } from "./storefront-favorite-button"
import { StorefrontFavoriteNotice } from "./storefront-favorite-notice"
import { StorefrontProductCard } from "./storefront-product-card"

const meta = {
  title: "Blocos/Vitrine/Coração",
  component: StorefrontFavoriteButton,
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), padding: 24 }}>{Story()}</div>],
  args: { name: "Pré-Treino Haze Hardcore 600g", liked: false, look: "icon", onToggle: () => {} },
} satisfies Meta<typeof StorefrontFavoriteButton>

export default meta
type Story = StoryObj<typeof meta>

/** Ainda não curtido: o contorno do coração. */
export const Vazio: Story = {}

/** Curtido: cheio, na cor da loja. */
export const Curtido: Story = { args: { liked: true } }

/** Sem sessão: um link para entrar, que volta com o produto curtido. */
export const SemSessao: Story = { args: { signInHref: "#" } }

/** No quadro de compra da 5b, em palavras. */
export const NoQuadroDeCompra: Story = {
  args: { look: "text" },
  render: (args) => (
    <div style={{ width: 320 }} className="flex flex-col gap-3">
      <StorefrontFavoriteButton {...args} />
      <StorefrontFavoriteButton {...args} liked />
    </div>
  ),
}

/** No card da vitrine, no canto da foto. */
export const NoCard: Story = {
  render: (args) => (
    <div style={{ width: 259 }}>
      <StorefrontProductCard
        product={{ id: "p", slug: "haze", name: args.name, priceCents: 20990, compareAtPriceCents: 23990, imageUrl: null }}
        href="#"
        locale="pt-BR"
        favorite={<StorefrontFavoriteButton {...args} liked />}
      />
    </div>
  ),
}

/** Um toque que a loja recusou: o aviso no pé da tela, até ser fechado. */
export const Aviso: Story = {
  render: () => (
    <StorefrontFavoriteNotice
      message="Você já tem 200 favoritos, o máximo. Remova alguns para curtir outros."
      link={{ href: "#", label: "Ver favoritos" }}
      onClose={() => {}}
    />
  ),
}
