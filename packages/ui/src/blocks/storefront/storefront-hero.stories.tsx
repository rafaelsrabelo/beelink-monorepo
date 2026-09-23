// React
import type { CSSProperties } from "react"

// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { StorefrontHero } from "./storefront-hero"

const meta = {
  title: "Blocos/Vitrine/Banner de topo",
  component: StorefrontHero,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      // The shop's variables, which the window normally writes. A hero draws its scrim in the
      // shop's own ink, so without them there is nothing behind the words.
      <div
        style={
          {
            "--shop-text": "oklch(0.15 0 0)",
            "--shop-on-text": "oklch(1 0 0)",
            "--shop-background": "oklch(1 0 0)",
          } as CSSProperties
        }
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StorefrontHero>

export default meta
type Story = StoryObj<typeof meta>

const slide = (n: number, title: string) => ({
  id: String(n),
  imageUrl: `https://picsum.photos/seed/hero-${n}/1600/600`,
  title,
  subtitle: "Confira agora",
  href: "/loja/promo",
})

/** Um só é capa. É o caso de quase toda loja, e não desenha controle nenhum. */
export const Capa: Story = { args: { items: [slide(1, "Coleção de verão")] } }

/**
 * Dois ou mais viram carousel, e **não existe interruptor dizendo isso** — a forma é lida da
 * contagem. `layoutSettings.bannerType` guardava exatamente esse interruptor ao lado de uma lista
 * de imagens, e nada nunca leu nenhum dos dois.
 */
export const Carousel: Story = {
  args: {
    items: [slide(1, "Coleção de verão"), slide(2, "Frete grátis"), slide(3, "Fale no WhatsApp")],
  },
}

/** Centralizado, para a loja que não quer a foto encostando nas bordas. */
export const Centralizado: Story = {
  args: { items: [slide(1, "Coleção de verão")], width: "CONTAINED" },
}

/** Uma foto que já traz as palavras dentro. O link ganha nome mesmo assim, por acessibilidade. */
export const SemPalavras: Story = {
  args: { items: [{ id: "1", imageUrl: "https://picsum.photos/seed/hero-9/1600/600", href: "/loja" }] },
}
