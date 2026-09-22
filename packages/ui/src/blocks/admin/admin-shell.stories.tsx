// Libs
import { HomeIcon, ShoppingBagIcon } from "lucide-react"
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { AdminBell } from "./admin-bell"
import { AdminHeader } from "./admin-header"
import { AdminSearch } from "./admin-search"
import { AdminShell } from "./admin-shell"
import { AdminSidebar } from "./admin-sidebar"
import { AdminStoreMenu } from "./admin-store-menu"
import { sampleAdminNav, sampleAdminUser, sampleWorkspaces } from "./admin.fixtures"

const icons = [<HomeIcon />, <ShoppingBagIcon />]
const items = sampleAdminNav.slice(0, 2).map((item, index) => ({ ...item, icon: icons[index] }))

const meta = {
  title: "Blocos/Admin/Moldura",
  component: AdminShell,
  parameters: { layout: "fullscreen" },
  args: {
    header: (
      <AdminHeader
        brandHref="/admin/lessari"
        onToggleSidebar={() => {}}
        search={<AdminSearch />}
        bell={<AdminBell />}
        storeMenu={
          <AdminStoreMenu
            current={sampleWorkspaces[0]}
            workspaces={sampleWorkspaces}
            createHref="/create-store"
            user={sampleAdminUser}
            onSignOut={() => {}}
          />
        }
      />
    ),
    sidebar: <AdminSidebar items={items} activeHref="/admin/lessari" />,
    children: (
      <div className="bg-shell-surface border-shell-border rounded-xl border p-5">
        <h1 className="text-lg font-semibold">Conteúdo</h1>
        <p className="text-muted-foreground text-sm">
          O card branco, sobre a página, ao lado da barra.
        </p>
      </div>
    ),
  },
  decorators: [
    (Story) => (
      <div className="h-[36rem]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AdminShell>

export default meta
type Story = StoryObj<typeof meta>

/** The whole frame: one dark bar, a rail a shade darker than the page, and the page rounded at the top. */
export const Padrao: Story = {}
