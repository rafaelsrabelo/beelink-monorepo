import type { Meta, StoryObj } from "@storybook/react-vite"

import { StorefrontCardSkeleton } from "./storefront-card-skeleton"

const meta = {
  title: "Blocos/Vitrine/Cartão carregando",
  component: StorefrontCardSkeleton,
  parameters: { layout: "centered" },
} satisfies Meta<typeof StorefrontCardSkeleton>

export default meta
type Story = StoryObj<typeof meta>

/** O cartão do produto a caminho, na largura de um cartão de trilho. */
export const Padrao: Story = { args: { className: "w-64" } }
