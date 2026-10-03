import type { Meta, StoryObj } from "@storybook/react-vite"

import { DeliveryCarriers } from "./delivery-carriers"
import { sampleConnectedCarriers } from "./delivery.fixtures"

const meta = {
  title: "Blocos/Entrega/Transportadoras",
  component: DeliveryCarriers,
  parameters: { layout: "padded" },
  args: { view: sampleConnectedCarriers, connectHref: "#conectar", manageHref: "#integracoes" },
} satisfies Meta<typeof DeliveryCarriers>

export default meta
type Story = StoryObj<typeof meta>

export const Conectado: Story = {}

export const Desconectado: Story = { args: { view: { ...sampleConnectedCarriers, status: "DISCONNECTED", accountName: null } } }

export const Reconectar: Story = { args: { view: { ...sampleConnectedCarriers, status: "NEEDS_RECONNECT" } } }

export const Indisponivel: Story = { args: { view: { available: false, status: "DISCONNECTED", accountName: null, sandbox: false } } }
