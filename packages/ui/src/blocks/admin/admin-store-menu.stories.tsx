// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Locales
import { en } from "../../locales/en"

// Block
import { AdminStoreMenu } from "./admin-store-menu"
import { sampleAdminUser, sampleWorkspaces } from "./admin.fixtures"

const meta = {
  title: "Blocos/Admin/Menu da loja",
  component: AdminStoreMenu,
  args: {
    current: sampleWorkspaces[0],
    workspaces: sampleWorkspaces,
    createHref: "/create-store",
    user: sampleAdminUser,
    onSignOut: () => {},
  },
  decorators: [
    (Story) => (
      <div className="bg-header flex justify-end p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AdminStoreMenu>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** No shop yet: the trigger shows a mark rather than initials, and the list is only the way in. */
export const SemLoja: Story = { args: { current: null, workspaces: [] } }

/** Signing out: the item is held so a second press cannot start it twice. */
export const Saindo: Story = { args: { signingOut: true } }

export const EmIngles: Story = { args: { messages: en } }
