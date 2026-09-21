import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import {
  Sidebar,
  SidebarFooter,
  SidebarProvider,
} from "@harness-monorepo/ui/components/sidebar"

import { en } from "../../locales/en"
import { sampleUser } from "./dashboard.fixtures"
import { NavUser } from "./nav-user"

const meta = {
  title: "Blocos/Painel/Conta",
  component: NavUser,
  parameters: { layout: "fullscreen" },
  args: { user: sampleUser, onSignOut: fn() },
  decorators: [
    (Story) => (
      <SidebarProvider>
        <Sidebar collapsible="none">
          <SidebarFooter>
            <Story />
          </SidebarFooter>
        </Sidebar>
      </SidebarProvider>
    ),
  ],
} satisfies Meta<typeof NavUser>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** No picture: the initials stand in, so the corner never renders a hole. */
export const ComFoto: Story = {
  args: {
    user: { ...sampleUser, avatarUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg" },
  },
}

/** A long name and a long address both have to fit in a fixed-width sidebar. */
export const NomeLongo: Story = {
  args: {
    user: {
      name: "Maria Aparecida do Nascimento Silva",
      email: "maria.aparecida@umaempresamuitolonga.com.br",
    },
  },
}

export const Saindo: Story = {
  args: { signingOut: true },
}

export const EmIngles: Story = {
  args: { messages: en },
}
