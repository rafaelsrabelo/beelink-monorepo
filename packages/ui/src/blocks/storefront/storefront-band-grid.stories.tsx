import type { CSSProperties } from "react"

import type { Meta, StoryObj } from "@storybook/react-vite"

import { StorefrontBandCell, type StorefrontSpan } from "./storefront-band-cell"
import { StorefrontBandGrid } from "./storefront-band-grid"
import { StorefrontShowcase } from "./storefront-showcase"

function poster(id: string, title: string, span: StorefrontSpan) {
  return (
    <StorefrontBandCell key={id} span={span}>
      <StorefrontShowcase
        span={span}
        items={[{ id, title, subtitle: span, imageUrl: `https://picsum.photos/seed/band-${id}/1200/700`, href: "#" }]}
      />
    </StorefrontBandCell>
  )
}

const meta = {
  title: "Blocos/Vitrine/Grade da faixa",
  component: StorefrontBandGrid,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div
        style={
          {
            "--shop-text": "oklch(0.15 0 0)",
            "--shop-background": "oklch(1 0 0)",
            "--shop-on-text": "oklch(1 0 0)",
          } as CSSProperties
        }
      >
        <Story />
      </div>
    ),
  ],
  args: { children: null },
} satisfies Meta<typeof StorefrontBandGrid>

export default meta
type Story = StoryObj<typeof meta>

/** A faixa inteira, um bloco só. */
export const Cheio: Story = { args: { children: poster("1", "Coleção de inverno", "FULL") } }

/** Duas metades lado a lado: o pedido que abriu o épico. Abaixo de 640px, uma embaixo da outra. */
export const Metades: Story = {
  args: { children: [poster("2", "Frete grátis", "HALF"), poster("3", "Pix com desconto", "HALF")] },
}

/** Três terços numa fileira a partir de 1024px; entre 640px e 1024px, dois por fileira. */
export const Tercos: Story = {
  args: {
    children: [poster("4", "Troca fácil", "THIRD"), poster("5", "Entrega rápida", "THIRD"), poster("6", "Parcelado", "THIRD")],
  },
}

/** Dois terços e um terço na mesma fileira. Entre 640px e 1024px viram duas metades. */
export const DoisTercosEUmTerco: Story = {
  args: { children: [poster("7", "Lançamento da semana", "TWO_THIRDS"), poster("8", "Mais vendido", "THIRD")] },
}

/** As quatro larguras na mesma faixa, fluindo em fileiras. */
export const Misturado: Story = {
  args: {
    children: [
      poster("9", "Cheio", "FULL"),
      poster("10", "Dois terços", "TWO_THIRDS"),
      poster("11", "Um terço", "THIRD"),
      poster("12", "Metade", "HALF"),
      poster("13", "Metade", "HALF"),
    ],
  },
}

/** Faixa ponta a ponta: 16px entre vizinhos, e blocos empilhados se encostam, como antes da grade. */
export const PontaAPonta: Story = {
  args: { bleed: true, children: [poster("14", "Esquerda", "HALF"), poster("15", "Direita", "HALF")] },
}
