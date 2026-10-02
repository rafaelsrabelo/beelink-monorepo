import type { Meta, StoryObj } from "@storybook/react-vite"

import { DeliverySettingsSkeleton } from "./delivery-settings-skeleton"

const meta = {
  title: "Blocos/Entrega/Aba Entrega carregando",
  component: DeliverySettingsSkeleton,
  parameters: { layout: "padded" },
} satisfies Meta<typeof DeliverySettingsSkeleton>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}
