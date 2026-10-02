import type { Meta, StoryObj } from "@storybook/react-vite"

import { fn } from "storybook/test"

import { DeliverySettingsFailed } from "./delivery-settings-failed"
import { DeliverySettingsSkeleton } from "./delivery-settings-skeleton"

const meta = {
  title: "Blocos/Entrega/Aba Entrega carregando ou com falha",
  component: DeliverySettingsSkeleton,
  parameters: { layout: "padded" },
} satisfies Meta<typeof DeliverySettingsSkeleton>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** The rules could not be read: said so, with the way to ask again. */
export const Falhou: Story = { render: () => <DeliverySettingsFailed onRetry={fn()} /> }
