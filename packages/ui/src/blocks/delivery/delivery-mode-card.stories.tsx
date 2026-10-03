import type { Meta, StoryObj } from "@storybook/react-vite"
import { StoreIcon } from "lucide-react"
import { fn } from "storybook/test"

import { DeliveryModeCard } from "./delivery-mode-card"

const meta = {
  title: "Blocos/Entrega/Cartão de modo",
  component: DeliveryModeCard,
  parameters: { layout: "padded" },
  args: {
    icon: <StoreIcon />,
    title: "Retirada na loja",
    description: "O cliente busca o pedido no endereço da loja.",
    checked: true,
    onCheckedChange: fn(),
    children: <p className="text-sm">Endereço de retirada: Rua Augusta, 1500</p>,
  },
} satisfies Meta<typeof DeliveryModeCard>

export default meta
type Story = StoryObj<typeof meta>

export const Ligado: Story = {}

export const Desligado: Story = { args: { checked: false, children: null } }
