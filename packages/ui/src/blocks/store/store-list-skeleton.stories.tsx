import type { Meta, StoryObj } from "@storybook/react-vite"

import { StoreListSkeleton } from "./store-list-skeleton"

const meta = {
  title: "Blocos/Loja/Esqueleto da lista",
  component: StoreListSkeleton,
} satisfies Meta<typeof StoreListSkeleton>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** One card is enough when the shopkeeper is known to have a single shop. */
export const UmaLoja: Story = {
  args: { count: 1 },
}
