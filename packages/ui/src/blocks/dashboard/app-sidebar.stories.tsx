import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { SidebarProvider } from "@harness-monorepo/ui/components/sidebar"

import { AppSidebar } from "./app-sidebar"
import { sampleNavMain, sampleNavSecondary, sampleUser } from "./dashboard.fixtures"

const meta = {
  title: "Blocos/Painel/Barra lateral",
  component: AppSidebar,
  parameters: { layout: "fullscreen" },
  args: {
    user: sampleUser,
    onSignOut: fn(),
    navMain: sampleNavMain,
    navSecondary: sampleNavSecondary,
    activeHref: "/dashboard",
  },
  decorators: [
    (Story) => (
      <SidebarProvider>
        <Story />
      </SidebarProvider>
    ),
  ],
} satisfies Meta<typeof AppSidebar>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

export const NomeLongo: Story = {
  args: { user: { name: "Maria Aparecida do Nascimento Silva", email: "maria.aparecida@umaempresamuitolonga.com.br" } },
}

export const Saindo: Story = {
  args: { signingOut: true },
}
