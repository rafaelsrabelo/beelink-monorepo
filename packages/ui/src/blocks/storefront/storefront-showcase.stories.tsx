import type { CSSProperties } from "react"

import type { Meta, StoryObj } from "@storybook/react-vite"

import { StorefrontShowcase } from "./storefront-showcase"

const thirds = [
  { id: "1", title: "Creatina Ultramesh", subtitle: "MESH 500", imageUrl: "https://picsum.photos/seed/sc-1/900/700", href: "/loja/produtos/creatina", layout: "THIRDS" as const },
  { id: "2", title: "Pre-Workout Energy Drink 269ml", subtitle: "Zero sódio. 200 mg de cafeína.", imageUrl: "https://picsum.photos/seed/sc-2/900/700", href: "/loja/produtos/pre", layout: "THIRDS" as const },
  { id: "3", title: "Whey Concentrado", subtitle: "Proteína concentrada pura (sem blends)", imageUrl: "https://picsum.photos/seed/sc-3/900/700", href: "/loja/produtos/whey", layout: "THIRDS" as const },
]

const halves = [
  { id: "4", title: "É mais sabor", subtitle: "A linha Delicious inteira", imageUrl: "https://picsum.photos/seed/sc-4/1200/675", href: "/loja/delicious", layout: "HALVES" as const },
  { id: "5", title: "Invoque seus treinos", subtitle: "Diabo Verde", imageUrl: "https://picsum.photos/seed/sc-5/1200/675", href: "/loja/diabo-verde", layout: "HALVES" as const },
]

const meta = {
  title: "Blocos/Vitrine/Destaques da loja",
  component: StorefrontShowcase,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div style={{ "--shop-text": "oklch(0.15 0 0)", "--shop-background": "oklch(1 0 0)", "--shop-primary": "oklch(0.6 0.22 25)" } as CSSProperties}>
        <Story />
      </div>
    ),
  ],
  args: { items: thirds },
} satisfies Meta<typeof StorefrontShowcase>

export default meta
type Story = StoryObj<typeof meta>

/** Três por linha: um nome, uma linha e a seta. */
export const TresPorLinha: Story = {}

/** Dois por linha, mais largos: arte com espaço para respirar. */
export const DoisPorLinha: Story = {
  args: { items: halves },
}

/** O lojista alternou as formas, então cada uma ganha a sua linha. */
export const Misturado: Story = {
  args: { items: [...thirds, ...halves] },
}

/** Sem destino: é um cartaz, e não desenha seta nenhuma. */
export const SemLink: Story = {
  args: { items: thirds.map((item) => ({ ...item, href: null })) },
}
