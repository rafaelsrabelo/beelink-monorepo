import type { Meta, StoryObj } from "@storybook/react-vite"
import { HelpCircleIcon, SettingsIcon } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
} from "@harness-monorepo/ui/components/sidebar"

import { sampleNavSecondary } from "./dashboard.fixtures"
import { NavSecondary } from "./nav-secondary"

const meta = {
  title: "Blocos/Painel/Navegação secundária",
  component: NavSecondary,
  parameters: { layout: "fullscreen" },
  args: { items: sampleNavSecondary },
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
} satisfies Meta<typeof NavSecondary>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

export const ComIcones: Story = {
  args: {
    items: [
      { ...sampleNavSecondary[0], icon: <SettingsIcon /> },
      { ...sampleNavSecondary[1], icon: <HelpCircleIcon /> },
    ],
  },
}

/** How the shell uses it: pushed to the foot of the sidebar by the class it passes through. */
export const NoRodapeDaBarra: Story = {
  args: { className: "mt-auto" },
}
