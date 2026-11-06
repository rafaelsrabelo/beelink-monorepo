// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { ProductStatusBadge } from "./product-status-badge"

const meta = {
  title: "Blocos/Catálogo/Status do produto",
  component: ProductStatusBadge,
  parameters: { layout: "padded" },
  args: { status: "ACTIVE", soldOut: false },
} satisfies Meta<typeof ProductStatusBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Ativo: Story = {}

export const Rascunho: Story = { args: { status: "DRAFT" } }

export const Esgotado: Story = { args: { soldOut: true } }
