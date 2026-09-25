// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { StorefrontRestockDialog } from "./storefront-restock-dialog"

const meta = {
  title: "Blocos/Vitrine/Avise-me",
  component: StorefrontRestockDialog,
  parameters: { layout: "centered" },
  args: {
    open: true,
    onOpenChange: () => {},
    productName: "Blusa tomara que caia",
    variantLabel: "M · Areia",
    onSubmit: () => {},
    status: "idle",
  },
} satisfies Meta<typeof StorefrontRestockDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

export const Recusado: Story = { args: { error: "Informe o WhatsApp com DDD, entre 10 e 15 dígitos" } }

export const Enviado: Story = { args: { status: "sent" } }
