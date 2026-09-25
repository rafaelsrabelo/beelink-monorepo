// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Lib
import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

// Block
import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontFooter } from "./storefront-footer"

const meta = {
  title: "Blocos/Vitrine/Rodapé",
  component: StorefrontFooter,
  parameters: { layout: "fullscreen" },
  // The footer reads the shop's variables, which the window sets; alone, it is dressed here.
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[4]!.colors)}>{Story()}</div>],
  args: {
    name: "Padaria da Ana",
    logoUrl: "https://picsum.photos/seed/padaria-logo/200/200",
    addressLine: "Rua das Flores, 120 · Aldeota, Fortaleza — CE",
    links: [
      { network: "instagram", href: "https://instagram.com/padariadaana" },
      { network: "tiktok", href: "https://tiktok.com/@padariadaana" },
    ],
    columns: [
      {
        id: "shop",
        title: "A loja",
        items: [
          { label: "Todos os produtos", href: "/padaria-da-ana/produtos" },
          { label: "Categorias", href: "/padaria-da-ana/categorias" },
          { label: "Carrinho", href: "/padaria-da-ana/carrinho" },
        ],
      },
      { id: "contact", title: "Atendimento", items: [{ label: "Fazer pedido no WhatsApp", href: "https://wa.me/5585999998888" }] },
    ],
    copyright: "© 2026 Padaria da Ana. Todos os direitos reservados.",
  },
} satisfies Meta<typeof StorefrontFooter>

export default meta
type Story = StoryObj<typeof meta>

/** O rodapé como sempre foi: o design 5a/5b não desenha um, então este é o de hoje. */
export const Padrao: Story = {}

/** Sem logo nem endereço: o nome em texto, e nada de espaço vazio. */
export const SemLogo: Story = { args: { logoUrl: null, addressLine: null, links: [] } }
