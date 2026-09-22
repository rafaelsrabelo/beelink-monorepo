// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Locales
import { en } from "../../locales/en"

// Block
import { AdminBell } from "./admin-bell"
import { AdminHeader } from "./admin-header"
import { AdminSearch } from "./admin-search"
import { AdminStoreMenu } from "./admin-store-menu"
import { sampleAdminUser, sampleWorkspaces } from "./admin.fixtures"

const meta = {
  title: "Blocos/Admin/Cabeçalho",
  component: AdminHeader,
  parameters: { layout: "fullscreen" },
  args: {
    brandHref: "/admin/lessari",
    onToggleSidebar: () => {},
    search: <AdminSearch />,
    bell: <AdminBell />,
    storeMenu: (
      <AdminStoreMenu
        current={sampleWorkspaces[0]}
        workspaces={sampleWorkspaces}
        createHref="/create-store"
        user={sampleAdminUser}
        onSignOut={() => {}}
      />
    ),
  },
  decorators: [
    (Story) => (
      <div className="h-32">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AdminHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** With something to read: the dot appears and the count goes into the accessible name. */
export const ComNotificacoes: Story = { args: { bell: <AdminBell unread={4} /> } }

/** No shop yet — the one state where the control on the right has nothing to switch between. */
export const SemLoja: Story = {
  args: {
    storeMenu: (
      <AdminStoreMenu
        current={null}
        workspaces={[]}
        createHref="/create-store"
        user={sampleAdminUser}
        onSignOut={() => {}}
      />
    ),
  },
}

export const EmIngles: Story = { args: { messages: en, search: <AdminSearch messages={en} /> } }
