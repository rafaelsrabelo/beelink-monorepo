// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { CustomerToolbar } from "./customer-toolbar"

const meta = {
  title: "Blocos/Clientes/Busca e ordem",
  component: CustomerToolbar,
  parameters: { layout: "padded" },
  args: { search: "", onSearchChange: () => {}, sort: "RECENT", onSortChange: () => {} },
  // Search and order sit side by side where the panel's main column has room.
  decorators: [
    (Story) => (
      <div className="@container/main">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CustomerToolbar>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

export const MaiorGasto: Story = { args: { search: "bia", sort: "TOP_SPENT" } }
