import type { Meta, StoryObj } from "@storybook/react-vite"

import { en } from "../../locales/en"
import { StoreEmptyState } from "./store-empty-state"

const meta = {
  title: "Blocos/Loja/Sem lojas",
  component: StoreEmptyState,
  args: { createHref: "/criar-loja" },
} satisfies Meta<typeof StoreEmptyState>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

export const EmIngles: Story = {
  args: { messages: en },
}
