import type { Meta, StoryObj } from "@storybook/react-vite"

import { StorefrontShelfSkeleton } from "./storefront-shelf-skeleton"

const meta = {
  title: "Blocos/Vitrine/Vitrine carregando",
  component: StorefrontShelfSkeleton,
  parameters: { layout: "padded" },
} satisfies Meta<typeof StorefrontShelfSkeleton>

export default meta
type Story = StoryObj<typeof meta>

/** Um trilho a caminho: cartões de largura fixa saindo pela borda. */
export const Trilho: Story = { args: { display: "RAIL" } }

/** Uma grade a caminho: fileiras de cartões. */
export const Grade: Story = { args: { display: "GRID" } }
