import type { Meta, StoryObj } from "@storybook/react-vite"

import { sampleColorPresets, sampleDarkShopColors } from "../store/store.fixtures"
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

const TOKENS = [
  "background",
  "on-background",
  "primary",
  "on-primary",
  "primary-ink",
  "header",
  "on-header",
  "primary-on-header",
  "on-primary-on-header",
  "primary-on-header-soft",
  "text",
  "on-text",
  "muted",
  "line",
  "line-strong",
  "frame",
  "fill",
  "placeholder",
  "canvas",
  "sale",
  "sale-ink",
  "positive",
  "positive-ink",
  "rating",
  "verified",
  "verified-ink",
] as const

/** Every `--shop-*` token, as a swatch inside the window that sets it. */
function Swatches() {
  return (
    <ul className="grid grid-cols-2 gap-3 shop-sm:grid-cols-4 shop-lg:grid-cols-6">
      {TOKENS.map((token) => (
        <li key={token} className="flex flex-col gap-1 text-xs">
          <span
            className="h-12 w-full rounded-lg border"
            style={{ backgroundColor: `var(--shop-${token})`, borderColor: "var(--shop-line-strong)" }}
          />
          <code>--shop-{token}</code>
        </li>
      ))}
    </ul>
  )
}

/** Uma loja clara, com todos os tokens da paleta desenhados como amostras. */
export const Tokens: Story = {
  args: { children: <Swatches /> },
}

/**
 * Uma loja escura: os neutros clareiam, as tintas semânticas trocam para a variante de página escura
 * e a marca amarela continua legível no cabeçalho.
 */
export const LojaEscura: Story = {
  args: { colors: sampleDarkShopColors, children: <Swatches /> },
}

/**
 * A composição de 5a: uma faixa em largura total logo abaixo do menu, e a página sobre o chão
 * cinza, decidindo o próprio ritmo. B3 e B4 preenchem os dois.
 */
export const FaixaEChao: Story = {
  args: {
    pageHeader: (
      <div className="w-full border-b" style={{ borderColor: "var(--shop-line)" }}>
        <div className="mx-auto w-full max-w-[1440px] px-4 py-4 shop-sm:px-6 shop-lg:px-8">
          <p className="text-2xl font-extrabold">Pré-treino</p>
          <p className="text-sm" style={{ color: "var(--shop-muted)" }}>1–16 de 86 resultados</p>
        </div>
      </div>
    ),
    layout: "flush",
    surface: "canvas",
    children: (
      <div className="grid grid-cols-2 gap-4 py-5 shop-lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, at) => (
          <div key={at} className="h-64 rounded-xl border" style={{ backgroundColor: "var(--shop-background)", borderColor: "var(--shop-line)" }} />
        ))}
      </div>
    ),
  },
}
