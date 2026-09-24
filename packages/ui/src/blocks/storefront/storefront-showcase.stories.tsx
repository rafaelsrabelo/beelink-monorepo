import type { CSSProperties } from "react"

import type { Meta, StoryObj } from "@storybook/react-vite"

import { StorefrontShowcase } from "./storefront-showcase"

const creatina = {
  id: "1",
  title: "Creatina Ultramesh",
  subtitle: "MESH 500",
  imageUrl: "https://picsum.photos/seed/sc-1/900/700",
  href: "/loja/produtos/creatina",
}

const delicious = {
  id: "4",
  title: "É mais sabor",
  subtitle: "A linha Delicious inteira",
  imageUrl: "https://picsum.photos/seed/sc-4/1200/675",
  href: "/loja/delicious",
}

const meta = {
  title: "Blocos/Vitrine/Destaques da loja",
  component: StorefrontShowcase,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div
        style={
          {
            "--shop-text": "oklch(0.15 0 0)",
            "--shop-background": "oklch(1 0 0)",
            "--shop-primary": "oklch(0.6 0.22 25)",
          } as CSSProperties
        }
      >
        <Story />
      </div>
    ),
  ],
  args: { items: [delicious], span: "FULL" },
} satisfies Meta<typeof StorefrontShowcase>

export default meta
type Story = StoryObj<typeof meta>

/** A faixa inteira: o cartaz de cinema, que fica mais alto conforme a tela estreita. */
export const Cheio: Story = {}

/** Dois terços: 8:3 a partir de 640px, para ficar da altura do terço ao lado. */
export const DoisTercos: Story = { args: { span: "TWO_THIRDS" } }

/** Metade: arte com espaço para respirar. */
export const Metade: Story = { args: { span: "HALF" } }

/** Um terço: um nome, uma linha e a seta. */
export const UmTerco: Story = { args: { items: [creatina], span: "THIRD" } }

/** Sem destino: é um cartaz, e não desenha seta nenhuma. */
export const SemLink: Story = { args: { items: [{ ...creatina, href: null }], span: "THIRD" } }

/** Um banner em grade: as imagens lado a lado, tantas colunas quanto a célula comporta. */
export const Grade: Story = {
  args: {
    items: [creatina, { ...delicious, id: "5" }, { ...creatina, id: "6", title: "Whey Concentrado" }],
    span: "FULL",
  },
}
