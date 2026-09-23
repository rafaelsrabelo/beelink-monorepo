import type { Meta, StoryObj } from "@storybook/react-vite"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontWindow } from "./storefront-window"

const links = [
  { network: "instagram" as const, href: "https://instagram.com/padariadaana" },
  { network: "tiktok" as const, href: "https://tiktok.com/@padariadaana" },
]

const meta = {
  title: "Blocos/Vitrine/Janela da loja",
  component: StorefrontWindow,
  parameters: { layout: "fullscreen" },
  args: {
    name: "Padaria da Ana",
    description: "Pães, bolos e café da manhã, feitos no dia e entregues na região.",
    logoUrl: "https://picsum.photos/seed/padaria-logo/200/200",
    homeHref: "/padaria-da-ana",
    colors: sampleColorPresets[4].colors,
    searchAction: "/padaria-da-ana",
    orderHref: "https://wa.me/5585999998888",
    links,
    addressLine: "Rua das Flores, 120 · Aldeota, Fortaleza — CE",
  },
} satisfies Meta<typeof StorefrontWindow>

export default meta
type Story = StoryObj<typeof meta>

/** The median bee-link shop: a name, a description, a WhatsApp. No banner, no promises, no cart. */
export const LojaPequena: Story = {}

/** Every band at once, as the big Brazilian shops lay them out. */
export const Completa: Story = {
  args: {
    banner: { imageUrl: "https://picsum.photos/seed/capa/1600/600", href: "/padaria-da-ana?categoria=promocoes" },
    bannerBelow: { imageUrl: "https://picsum.photos/seed/rodape/1600/400" },
    highlights: [
      { id: "1", title: "Entrega no bairro", detail: "Sem taxa acima de R$ 60" },
      { id: "2", title: "Pague no PIX", detail: "Confirmação na hora" },
      { id: "3", title: "Feito no dia", detail: "Saiu do forno hoje" },
      { id: "4", title: "Fale direto", detail: "WhatsApp, sem robô" },
    ],
  },
}

/**
 * The cart and the account icon appear only when the screen hands over an address for them, and
 * today it hands over neither — there is no cart and no buyer account in the product. This story
 * exists to show what the header becomes on the day there is.
 */
export const ComCarrinho: Story = {
  args: { cartHref: "/padaria-da-ana/carrinho", cartCount: 3, accountHref: "/padaria-da-ana/conta" },
}

export const SemWhatsapp: Story = {
  args: { orderHref: undefined },
}

/**
 * Um site institucional: sem busca, carrinho nem conta. O cabeçalho é o menu das faixas com
 * nome, cada uma uma âncora na mesma página; num celular o menu some e os mesmos nomes estão no
 * rodapé. Todo o resto — cores, tinta derivada, barra de aviso — é a mesma janela.
 */
export const Site: Story = {
  args: {
    searchAction: undefined,
    cartHref: undefined,
    accountHref: undefined,
    categories: undefined,
    menu: [
      { id: "servicos", label: "Serviços", href: "#servicos" },
      { id: "sobre", label: "Sobre", href: "#sobre" },
      { id: "contato", label: "Contato", href: "#contato" },
    ],
    footerColumns: [
      {
        id: "navigation",
        title: "Navegação",
        items: [
          { label: "Serviços", href: "#servicos" },
          { label: "Sobre", href: "#sobre" },
          { label: "Contato", href: "#contato" },
        ],
      },
    ],
    orderHref: undefined,
  },
}
