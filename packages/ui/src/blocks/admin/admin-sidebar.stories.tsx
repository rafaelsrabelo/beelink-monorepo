// Libs
import { HomeIcon, PackageIcon, SettingsIcon, ShoppingBagIcon, UsersIcon } from "lucide-react"
import type { Meta, StoryObj } from "@storybook/react-vite"

// Locales
import { en } from "../../locales/en"

// Block
import { AdminSidebar } from "./admin-sidebar"
import { sampleAdminFooterNav, sampleAdminNav } from "./admin.fixtures"

const icons = [<HomeIcon />, <ShoppingBagIcon />, <PackageIcon />, <UsersIcon />]
const items = sampleAdminNav.map((item, index) => ({ ...item, icon: icons[index] }))
const footerItems = sampleAdminFooterNav.map((item) => ({ ...item, icon: <SettingsIcon /> }))

const meta = {
  title: "Blocos/Admin/Barra lateral",
  component: AdminSidebar,
  parameters: { layout: "fullscreen" },
  args: { items, footerItems, activeHref: "/admin/lessari" },
  decorators: [
    (Story) => (
      <div className="bg-shell h-[32rem]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AdminSidebar>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** Inside a section with pages of its own, where an exact rule would light nothing. */
export const EmProdutos: Story = { args: { activeHref: "/admin/lessari/products/novo" } }

/**
 * No shop yet. The rail keeps its shape and leads nowhere, which is what tells a new account what
 * the panel is about to become — where an empty rail would only look broken.
 */
export const SemLoja: Story = {
  args: {
    items: items.map((item) => ({ ...item, disabled: true })),
    footerItems: footerItems.map((item) => ({ ...item, disabled: true })),
    activeHref: undefined,
  },
}

export const EmIngles: Story = { args: { messages: en } }
