import type { Meta, StoryObj } from "@storybook/react-vite"
import { ChartBarIcon, LayoutDashboardIcon, UsersIcon } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
} from "@harness-monorepo/ui/components/sidebar"

import { sampleNavMain } from "./dashboard.fixtures"
import { NavMain } from "./nav-main"

const meta = {
  title: "Blocos/Painel/Navegação principal",
  component: NavMain,
  parameters: { layout: "fullscreen" },
  args: { items: sampleNavMain, activeHref: "/dashboard" },
  decorators: [
    (Story) => (
      <SidebarProvider>
        <Sidebar collapsible="none">
          <SidebarContent>
            <Story />
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>
    ),
  ],
} satisfies Meta<typeof NavMain>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** The icon is the screen's, not the block's — a block that shipped one would decide the product. */
export const ComIcones: Story = {
  args: {
    items: [
      { ...sampleNavMain[0], icon: <LayoutDashboardIcon /> },
      { ...sampleNavMain[1], icon: <ChartBarIcon /> },
      { ...sampleNavMain[2], icon: <UsersIcon /> },
    ],
  },
}

/** Nothing matches the current address: the list renders, and no item claims to be the page. */
export const SemItemAtivo: Story = {
  args: { activeHref: "/outra-pagina" },
}
