import type { Meta, StoryObj } from "@storybook/react-vite"

import { StorefrontListingSkeleton } from "./storefront-listing-skeleton"

const meta = {
  title: "Blocos/Vitrine/Listagem carregando",
  component: StorefrontListingSkeleton,
  parameters: { layout: "padded" },
} satisfies Meta<typeof StorefrontListingSkeleton>

export default meta
type Story = StoryObj<typeof meta>

/** O catálogo, uma categoria ou uma busca a caminho: a trilha, o título, a contagem e uma página de cartões. */
export const TresPorLinha: Story = {}

/** Com quatro por linha, a grade de 5a. */
export const QuatroPorLinha: Story = { args: { productsPerRow: 4 } }
