import type { Meta, StoryObj } from "@storybook/react-vite"

import { StoreSettingsSkeleton } from "./store-settings-skeleton"

const meta = {
  title: "Blocos/Loja/Esqueleto das configurações",
  component: StoreSettingsSkeleton,
} satisfies Meta<typeof StoreSettingsSkeleton>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}
