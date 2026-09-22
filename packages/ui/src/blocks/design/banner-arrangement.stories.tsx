// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { BannerArrangement, type ArrangementItem } from "./banner-arrangement"

const items: ArrangementItem[] = [
  {
    id: "1",
    title: "Coleção de inverno",
    imageUrl: "https://picsum.photos/seed/arrange-winter/240/120",
    layout: "FULL",
    isActive: true,
  },
  {
    id: "2",
    title: "Frete grátis acima de R$ 199",
    imageUrl: "https://picsum.photos/seed/arrange-shipping/240/120",
    layout: "HALVES",
    isActive: true,
  },
  {
    id: "3",
    title: "Whey 900g",
    imageUrl: "https://picsum.photos/seed/arrange-whey/240/120",
    layout: "THIRDS",
    isActive: false,
  },
]

const meta = {
  title: "Blocos/Modo design/Arrumação de banners",
  component: BannerArrangement,
  parameters: { layout: "padded" },
  args: {
    items,
    onReorder: () => {},
    onToggle: () => {},
    onLayoutChange: () => {},
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BannerArrangement>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Arrasta com o mouse e **também** com o teclado: Tab até a alça, Espaço para pegar, setas para
 * mover, Espaço de novo para soltar. O terceiro banner está oculto — a loja não desenha nada dele.
 *
 * A "Lista de produtos" é uma linha como as outras e se arrasta igual. O que estiver acima dela
 * aparece antes dos produtos na loja; o que estiver abaixo, depois.
 */
export const Padrao: Story = {}

/** Um banner embaixo dos produtos — o caso que o arranjo existe para permitir. */
export const ComBannerAbaixoDosProdutos: Story = {
  args: { items: items.slice(0, 2), itemsBelow: items.slice(2) },
}

/** O que o lojista vê antes de criar o primeiro banner: um convite, não uma lista vazia. */
export const Vazio: Story = { args: { items: [] } }
