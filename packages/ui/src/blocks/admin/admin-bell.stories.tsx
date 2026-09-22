// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Locales
import { en } from "../../locales/en"

// Block
import { AdminBell } from "./admin-bell"

const meta = {
  title: "Blocos/Admin/Sino",
  component: AdminBell,
  parameters: { backgrounds: { default: "dark" } },
  decorators: [
    (Story) => (
      <div className="bg-header flex items-center justify-center p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AdminBell>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** The dot is a dot; the count lives in the accessible name, where it can be read. */
export const ComNaoLidas: Story = { args: { unread: 3 } }

/** One has its own sentence: "1 não lidas" is wrong, and no dictionary can hold the rule. */
export const UmaNaoLida: Story = { args: { unread: 1 } }

export const EmIngles: Story = { args: { unread: 3, messages: en } }
